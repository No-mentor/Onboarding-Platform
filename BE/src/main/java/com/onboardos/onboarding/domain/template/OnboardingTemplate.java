package com.onboardos.onboarding.domain.template;

import com.onboardos.onboarding.domain.common.BaseTimeEntity;
import com.onboardos.onboarding.domain.user.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "onboarding_templates")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OnboardingTemplate extends BaseTimeEntity {

    @Id
    private UUID id;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(nullable = false, length = 200)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_role", nullable = false, length = 30)
    private UserRole targetRole = UserRole.NEW_HIRE;

    private String description;

    @Column(name = "is_default", nullable = false)
    private boolean isDefault = false;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public static OnboardingTemplate create(
            UUID workspaceId,
            String name,
            UserRole targetRole,
            String description,
            boolean isDefault
    ) {
        OnboardingTemplate t = new OnboardingTemplate();
        t.id = UUID.randomUUID();
        t.workspaceId = workspaceId;
        t.name = name.trim();
        t.targetRole = targetRole == null ? UserRole.NEW_HIRE : targetRole;
        t.description = description;
        t.isDefault = isDefault;
        return t;
    }

    public void update(String name, UserRole targetRole, String description, Boolean isDefault) {
        if (name != null && !name.isBlank()) {
            this.name = name.trim();
        }
        if (targetRole != null) {
            this.targetRole = targetRole;
        }
        if (description != null) {
            this.description = description;
        }
        if (isDefault != null) {
            this.isDefault = isDefault;
        }
    }

    public void softDelete() {
        this.deletedAt = Instant.now();
    }
}
