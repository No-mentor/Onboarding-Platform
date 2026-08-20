package com.onboardos.onboarding.domain.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "email_verification_codes")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmailVerificationCode {

    private static final int MAX_ATTEMPTS = 5;

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 320)
    private String email;

    @Column(nullable = false, length = 6)
    private String code;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "last_sent_at", nullable = false)
    private Instant lastSentAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public static EmailVerificationCode create(UUID userId, String email, String code, Instant expiresAt) {
        EmailVerificationCode entity = new EmailVerificationCode();
        entity.id = UUID.randomUUID();
        entity.userId = userId;
        entity.email = email;
        entity.code = code;
        entity.expiresAt = expiresAt;
        entity.attempts = 0;
        entity.lastSentAt = Instant.now();
        entity.createdAt = Instant.now();
        return entity;
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public boolean isMaxAttemptsExceeded() {
        return attempts >= MAX_ATTEMPTS;
    }

    public void incrementAttempts() {
        this.attempts++;
    }

    public boolean matches(String inputCode) {
        return this.code.equals(inputCode);
    }

    public void refreshCode(String newCode, Instant newExpiresAt) {
        this.code = newCode;
        this.expiresAt = newExpiresAt;
        this.attempts = 0;
        this.lastSentAt = Instant.now();
    }

    public boolean canResend(long minIntervalSeconds) {
        return Instant.now().isAfter(lastSentAt.plusSeconds(minIntervalSeconds));
    }
}
