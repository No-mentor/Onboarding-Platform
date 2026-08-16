package com.onboardos.onboarding.domain.user;

import com.onboardos.onboarding.domain.common.BaseTimeEntity;
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
@Table(name = "users")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseTimeEntity {

    @Id
    private UUID id;

    @Column(nullable = false, length = 320)
    private String email;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = true;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public static User create(String email, String name, String passwordHash) {
        User user = new User();
        user.id = UUID.randomUUID();
        user.email = email.trim().toLowerCase();
        user.name = name.trim();
        user.passwordHash = passwordHash;
        user.active = true;
        user.emailVerified = false;
        return user;
    }

    public void markEmailVerified() {
        this.emailVerified = true;
    }

    public void markLogin() {
        this.lastLoginAt = Instant.now();
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }
}
