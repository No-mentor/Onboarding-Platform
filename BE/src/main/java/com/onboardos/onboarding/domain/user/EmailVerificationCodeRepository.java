package com.onboardos.onboarding.domain.user;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailVerificationCodeRepository extends JpaRepository<EmailVerificationCode, UUID> {

    Optional<EmailVerificationCode> findByEmail(String email);

    Optional<EmailVerificationCode> findByUserId(UUID userId);

    void deleteByUserId(UUID userId);
}
