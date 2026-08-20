package com.onboardos.onboarding.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.onboardos.onboarding.auth.dto.AuthResponse;
import com.onboardos.onboarding.auth.dto.LoginRequest;
import com.onboardos.onboarding.auth.dto.SignupRequest;
import com.onboardos.onboarding.auth.dto.SignupResponse;
import com.onboardos.onboarding.domain.user.MembershipRepository;
import com.onboardos.onboarding.domain.user.User;
import com.onboardos.onboarding.domain.user.UserRepository;
import com.onboardos.onboarding.domain.workspace.WorkspaceRepository;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.security.JwtTokenProvider;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final MembershipRepository membershipRepository = mock(MembershipRepository.class);
    private final WorkspaceRepository workspaceRepository = mock(WorkspaceRepository.class);
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final JwtTokenProvider jwtTokenProvider = mock(JwtTokenProvider.class);
    private final EmailVerificationService emailVerificationService = mock(EmailVerificationService.class);

    private final AuthService authService = new AuthService(
            userRepository, membershipRepository, workspaceRepository,
            passwordEncoder, jwtTokenProvider, emailVerificationService
    );

    @Test
    void signup_doesNotIssueToken_sendsVerificationCode() {
        when(userRepository.existsByEmailAndDeletedAtIsNull(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(emailVerificationService.createAndSendCode(any(User.class))).thenReturn(true);

        SignupResponse response = authService.signup(new SignupRequest("test@example.com", "password1", "테스트"));

        assertThat(response.email()).isEqualTo("test@example.com");
        assertThat(response.emailSent()).isTrue();
        assertThat(response.message()).contains("인증 코드가 발송되었습니다");
    }

    @Test
    void signup_mailFailed_returnsFailedResponse() {
        when(userRepository.existsByEmailAndDeletedAtIsNull(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(emailVerificationService.createAndSendCode(any(User.class))).thenReturn(false);

        SignupResponse response = authService.signup(new SignupRequest("test@example.com", "password1", "테스트"));

        assertThat(response.emailSent()).isFalse();
        assertThat(response.message()).contains("재발송");
    }

    @Test
    void login_unverifiedEmail_throws403() {
        String email = "test@example.com";
        String rawPassword = "password1";
        User user = User.create(email, "Test", passwordEncoder.encode(rawPassword));
        // User.create sets emailVerified = false

        when(userRepository.findByEmailAndDeletedAtIsNull(email)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest(email, rawPassword)))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.EMAIL_NOT_VERIFIED);
    }

    @Test
    void login_verifiedEmail_success() {
        String email = "test@example.com";
        String rawPassword = "password1";
        User user = User.create(email, "Test", passwordEncoder.encode(rawPassword));
        user.markEmailVerified();

        when(userRepository.findByEmailAndDeletedAtIsNull(email)).thenReturn(Optional.of(user));
        when(membershipRepository.findByUserIdAndDeletedAtIsNull(any())).thenReturn(List.of());
        when(jwtTokenProvider.createAccessToken(any(), anyString(), any())).thenReturn("jwt-token");
        when(jwtTokenProvider.getExpirationSeconds()).thenReturn(3600L);

        AuthResponse response = authService.login(new LoginRequest(email, rawPassword));

        assertThat(response.accessToken()).isEqualTo("jwt-token");
        assertThat(response.email()).isEqualTo(email);
    }

    @Test
    void login_wrongPassword_returns401_beforeEmailCheck() {
        String email = "test@example.com";
        User user = User.create(email, "Test", passwordEncoder.encode("correctPassword"));
        // emailVerified is false, but wrong password should throw UNAUTHORIZED first

        when(userRepository.findByEmailAndDeletedAtIsNull(email)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest(email, "wrongPassword")))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.UNAUTHORIZED);
    }
}
