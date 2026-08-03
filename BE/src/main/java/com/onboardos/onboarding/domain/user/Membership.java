package com.onboardos.onboarding.domain.user;

import com.onboardos.onboarding.domain.common.BaseTimeEntity;
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
@Table(name = "memberships")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Membership extends BaseTimeEntity {

    @Id
    private UUID id;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MembershipStatus status = MembershipStatus.ACTIVE;

    @Column(length = 100)
    private String department;

    @Column(name = "career_level", length = 30)
    private String careerLevel;

    @Column(length = 100)
    private String title;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public static Membership createOwner(UUID workspaceId, UUID userId) {
        return create(workspaceId, userId, UserRole.OWNER, null, null, null);
    }

    public static Membership create(
            UUID workspaceId,
            UUID userId,
            UserRole role,
            String department,
            String careerLevel,
            String title
    ) {
        Membership m = new Membership();
        m.id = UUID.randomUUID();
        m.workspaceId = workspaceId;
        m.userId = userId;
        m.role = role;
        m.status = MembershipStatus.ACTIVE;
        m.department = department;
        m.careerLevel = careerLevel;
        m.title = title;
        m.joinedAt = Instant.now();
        return m;
    }

    public boolean isActive() {
        return status == MembershipStatus.ACTIVE && deletedAt == null;
    }

    public void changeRole(UserRole role) {
        this.role = role;
    }

    public void changeStatus(MembershipStatus status) {
        this.status = status;
    }
}

