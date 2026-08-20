package com.onboardos.onboarding.domain.invitation;

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
@Table(name = "invitations")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Invitation extends BaseTimeEntity {

    @Id
    private UUID id;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(nullable = false, length = 320)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private UserRole role;

    private String department;

    @Column(name = "career_level")
    private String careerLevel;

    private String title;

    @Column(nullable = false, length = 64)
    private String token;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InvitationStatus status = InvitationStatus.PENDING;

    @Column(name = "invited_by")
    private UUID invitedBy;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    public static Invitation create(
            UUID workspaceId,
            String email,
            UserRole role,
            String department,
            String careerLevel,
            String title,
            UUID invitedBy,
            Instant expiresAt,
            String token
    ) {
        Invitation inv = new Invitation();
        inv.id = UUID.randomUUID();
        inv.workspaceId = workspaceId;
        inv.email = email.trim().toLowerCase();
        inv.role = role;
        inv.department = department;
        inv.careerLevel = careerLevel;
        inv.title = title;
        inv.invitedBy = invitedBy;
        inv.expiresAt = expiresAt;
        inv.token = token;
        inv.status = InvitationStatus.PENDING;
        return inv;
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public void markAccepted() {
        this.status = InvitationStatus.ACCEPTED;
        this.acceptedAt = Instant.now();
    }

    public void markExpired() {
        this.status = InvitationStatus.EXPIRED;
    }

    /** 초대한 사람이 취소했을 때. 같은 주소로 다시 초대할 수 있게 된다 */
    public void markRevoked() {
        this.status = InvitationStatus.REVOKED;
    }

    /** 재발송. 토큰은 그대로 두고 기한만 늘린다 (이미 보낸 메일의 링크도 계속 살아 있어야 하므로) */
    public void renew(Instant expiresAt) {
        this.status = InvitationStatus.PENDING;
        this.expiresAt = expiresAt;
    }
}
