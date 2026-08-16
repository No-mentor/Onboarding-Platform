package com.onboardos.onboarding.auth;

import com.onboardos.onboarding.auth.dto.ResendVerificationResponse;
import com.onboardos.onboarding.auth.dto.VerifyEmailRequest;
import com.onboardos.onboarding.auth.dto.VerifyEmailResponse;
import com.onboardos.onboarding.domain.user.EmailVerificationCode;
import com.onboardos.onboarding.domain.user.EmailVerificationCodeRepository;
import com.onboardos.onboarding.domain.user.User;
import com.onboardos.onboarding.domain.user.UserRepository;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.mail.MailService;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final int CODE_LENGTH = 6;
    private static final long CODE_EXPIRY_SECONDS = 5 * 60; // 5분
    private static final long RESEND_INTERVAL_SECONDS = 60; // 1분

    private final EmailVerificationCodeRepository verificationCodeRepository;
    private final UserRepository userRepository;
    private final MailService mailService;
    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * 회원가입 직후 인증 코드를 생성하고 발송합니다.
     * @return 발송 성공 여부
     */
    @Transactional
    public boolean createAndSendCode(User user) {
        String code = generateCode();
        Instant expiresAt = Instant.now().plusSeconds(CODE_EXPIRY_SECONDS);

        EmailVerificationCode verificationCode = EmailVerificationCode.create(
                user.getId(), user.getEmail(), code, expiresAt
        );
        verificationCodeRepository.save(verificationCode);

        try {
            mailService.sendVerificationCode(user.getEmail(), code);
            return true;
        } catch (MailException ex) {
            log.error("인증 코드 발송 실패: email={}", user.getEmail(), ex);
            return false;
        }
    }

    /**
     * 인증 코드를 검증합니다.
     */
    @Transactional
    public VerifyEmailResponse verify(VerifyEmailRequest request) {
        String email = request.email().trim().toLowerCase();

        EmailVerificationCode verification = verificationCodeRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "인증 요청을 찾을 수 없습니다."));

        if (verification.isMaxAttemptsExceeded()) {
            throw new BusinessException(ErrorCode.VERIFICATION_MAX_ATTEMPTS);
        }

        if (verification.isExpired()) {
            throw new BusinessException(ErrorCode.VERIFICATION_CODE_EXPIRED);
        }

        if (!verification.matches(request.code())) {
            verification.incrementAttempts();
            if (verification.isMaxAttemptsExceeded()) {
                throw new BusinessException(ErrorCode.VERIFICATION_MAX_ATTEMPTS);
            }
            throw new BusinessException(ErrorCode.VERIFICATION_CODE_INVALID);
        }

        // 인증 성공
        User user = userRepository.findById(verification.getUserId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        user.markEmailVerified();

        verificationCodeRepository.delete(verification);

        return VerifyEmailResponse.success(email);
    }

    /**
     * 인증 코드를 재발송합니다.
     * 이메일 열거 방지를 위해 모든 케이스에서 동일한 응답을 반환합니다.
     */
    @Transactional
    public ResendVerificationResponse resend(String email) {
        String normalizedEmail = email.trim().toLowerCase();

        Optional<User> userOpt = userRepository.findByEmailAndDeletedAtIsNull(normalizedEmail);

        // 존재하지 않는 이메일 → 동일 응답, 아무것도 안 함
        if (userOpt.isEmpty()) {
            log.debug("재발송 요청: 존재하지 않는 이메일={}", normalizedEmail);
            return ResendVerificationResponse.success();
        }

        User user = userOpt.get();

        // 이미 인증된 이메일 → 동일 응답, 아무것도 안 함
        if (user.isEmailVerified()) {
            log.debug("재발송 요청: 이미 인증된 이메일={}", normalizedEmail);
            return ResendVerificationResponse.success();
        }

        Optional<EmailVerificationCode> existingOpt = verificationCodeRepository.findByEmail(normalizedEmail);

        if (existingOpt.isPresent()) {
            EmailVerificationCode existing = existingOpt.get();

            // 재발송 간격 제한 (1분)
            if (!existing.canResend(RESEND_INTERVAL_SECONDS)) {
                log.debug("재발송 요청: 간격 미충족 email={}", normalizedEmail);
                return ResendVerificationResponse.success();
            }

            // 기존 코드 무효화 + 새 코드 생성
            String newCode = generateCode();
            Instant newExpiresAt = Instant.now().plusSeconds(CODE_EXPIRY_SECONDS);
            existing.refreshCode(newCode, newExpiresAt);

            try {
                mailService.sendVerificationCode(normalizedEmail, newCode);
            } catch (MailException ex) {
                log.error("재발송 실패: email={}", normalizedEmail, ex);
            }
        } else {
            // 코드 레코드가 없는 경우 (비정상 상태) → 새로 생성
            String newCode = generateCode();
            Instant expiresAt = Instant.now().plusSeconds(CODE_EXPIRY_SECONDS);
            EmailVerificationCode newVerification = EmailVerificationCode.create(
                    user.getId(), normalizedEmail, newCode, expiresAt
            );
            verificationCodeRepository.save(newVerification);

            try {
                mailService.sendVerificationCode(normalizedEmail, newCode);
            } catch (MailException ex) {
                log.error("재발송 실패: email={}", normalizedEmail, ex);
            }
        }

        return ResendVerificationResponse.success();
    }

    private String generateCode() {
        int number = secureRandom.nextInt(1_000_000);
        return String.format("%06d", number);
    }
}
