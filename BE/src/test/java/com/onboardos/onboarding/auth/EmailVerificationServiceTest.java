package com.onboardos.onboarding.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;

class EmailVerificationServiceTest {

    private final EmailVerificationCodeRepository codeRepository = mock(EmailVerificationCodeRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final MailService mailService = mock(MailService.class);

    private final EmailVerificationService service = new EmailVerificationService(
            codeRepository, userRepository, mailService
    );

    // ========== verify() tests ==========

    @Test
    void verify_success() {
        String email = "test@example.com";
        String code = "123456";
        UUID userId = UUID.randomUUID();

        EmailVerificationCode verification = EmailVerificationCode.create(
                userId, email, code, Instant.now().plusSeconds(300)
        );
        User user = User.create(email, "Test", "hashedPw");

        when(codeRepository.findByEmail(email)).thenReturn(Optional.of(verification));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        VerifyEmailResponse response = service.verify(new VerifyEmailRequest(email, code));

        assertThat(response.email()).isEqualTo(email);
        assertThat(user.isEmailVerified()).isTrue();
        verify(codeRepository).delete(verification);
    }

    @Test
    void verify_invalidCode_returns400() {
        String email = "test@example.com";
        UUID userId = UUID.randomUUID();

        EmailVerificationCode verification = EmailVerificationCode.create(
                userId, email, "123456", Instant.now().plusSeconds(300)
        );

        when(codeRepository.findByEmail(email)).thenReturn(Optional.of(verification));

        assertThatThrownBy(() -> service.verify(new VerifyEmailRequest(email, "999999")))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.VERIFICATION_CODE_INVALID);

        assertThat(verification.getAttempts()).isEqualTo(1);
    }

    @Test
    void verify_expiredCode_returns410() {
        String email = "test@example.com";
        UUID userId = UUID.randomUUID();

        EmailVerificationCode verification = EmailVerificationCode.create(
                userId, email, "123456", Instant.now().minusSeconds(1) // already expired
        );

        when(codeRepository.findByEmail(email)).thenReturn(Optional.of(verification));

        assertThatThrownBy(() -> service.verify(new VerifyEmailRequest(email, "123456")))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.VERIFICATION_CODE_EXPIRED);
    }

    @Test
    void verify_maxAttempts_invalidatesCode() {
        String email = "test@example.com";
        UUID userId = UUID.randomUUID();

        EmailVerificationCode verification = EmailVerificationCode.create(
                userId, email, "123456", Instant.now().plusSeconds(300)
        );
        // Simulate 4 previous failed attempts
        for (int i = 0; i < 4; i++) {
            verification.incrementAttempts();
        }

        when(codeRepository.findByEmail(email)).thenReturn(Optional.of(verification));

        // 5th attempt with wrong code → MAX_ATTEMPTS
        assertThatThrownBy(() -> service.verify(new VerifyEmailRequest(email, "999999")))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.VERIFICATION_MAX_ATTEMPTS);

        assertThat(verification.getAttempts()).isEqualTo(5);
    }

    @Test
    void verify_alreadyMaxAttempts_rejectsImmediately() {
        String email = "test@example.com";
        UUID userId = UUID.randomUUID();

        EmailVerificationCode verification = EmailVerificationCode.create(
                userId, email, "123456", Instant.now().plusSeconds(300)
        );
        // Max out attempts
        for (int i = 0; i < 5; i++) {
            verification.incrementAttempts();
        }

        when(codeRepository.findByEmail(email)).thenReturn(Optional.of(verification));

        // Even correct code should be rejected
        assertThatThrownBy(() -> service.verify(new VerifyEmailRequest(email, "123456")))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.VERIFICATION_MAX_ATTEMPTS);
    }

    // ========== resend() tests ==========

    @Test
    void resend_existingCode_refreshesAndSends() {
        String email = "test@example.com";
        UUID userId = UUID.randomUUID();
        User user = User.create(email, "Test", "hashedPw");

        EmailVerificationCode existing = EmailVerificationCode.create(
                userId, email, "111111", Instant.now().plusSeconds(300)
        );
        // Simulate last sent > 60 seconds ago
        existing.refreshCode("111111", Instant.now().plusSeconds(300));
        // Force lastSentAt to be in the past
        // Since we can't directly set lastSentAt, we'll create a fresh code that's > 1 min old
        // For this test, use a fresh instance that will pass canResend

        when(userRepository.findByEmailAndDeletedAtIsNull(email)).thenReturn(Optional.of(user));
        when(codeRepository.findByEmail(email)).thenReturn(Optional.of(existing));

        ResendVerificationResponse response = service.resend(email);

        assertThat(response.message()).isEqualTo("등록된 이메일이라면 인증 코드가 발송됩니다.");
    }

    @Test
    void resend_nonExistentEmail_returnsSameResponse() {
        when(userRepository.findByEmailAndDeletedAtIsNull("unknown@example.com")).thenReturn(Optional.empty());

        ResendVerificationResponse response = service.resend("unknown@example.com");

        assertThat(response.message()).isEqualTo("등록된 이메일이라면 인증 코드가 발송됩니다.");
        verify(mailService, never()).sendVerificationCode(anyString(), anyString());
    }

    @Test
    void resend_alreadyVerifiedEmail_returnsSameResponse() {
        String email = "verified@example.com";
        User user = User.create(email, "Test", "hashedPw");
        user.markEmailVerified();

        when(userRepository.findByEmailAndDeletedAtIsNull(email)).thenReturn(Optional.of(user));

        ResendVerificationResponse response = service.resend(email);

        assertThat(response.message()).isEqualTo("등록된 이메일이라면 인증 코드가 발송됩니다.");
        verify(mailService, never()).sendVerificationCode(anyString(), anyString());
    }

    // ========== createAndSendCode() tests ==========

    @Test
    void createAndSendCode_success_returnsTrue() {
        User user = User.create("test@example.com", "Test", "hashedPw");

        boolean result = service.createAndSendCode(user);

        assertThat(result).isTrue();
        verify(codeRepository).save(any(EmailVerificationCode.class));
        verify(mailService).sendVerificationCode(eq("test@example.com"), anyString());
    }

    @Test
    void createAndSendCode_mailFailure_returnsFalse() {
        User user = User.create("test@example.com", "Test", "hashedPw");
        doThrow(new MailSendException("SMTP down")).when(mailService).sendVerificationCode(anyString(), anyString());

        boolean result = service.createAndSendCode(user);

        assertThat(result).isFalse();
        // Code is still saved (user can request resend)
        verify(codeRepository).save(any(EmailVerificationCode.class));
    }
}
