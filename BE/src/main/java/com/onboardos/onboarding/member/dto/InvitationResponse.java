package com.onboardos.onboarding.member.dto;

import com.onboardos.onboarding.domain.invitation.InvitationStatus;
import com.onboardos.onboarding.domain.user.UserRole;
import java.time.Instant;
import java.util.UUID;

public record InvitationResponse(
        UUID invitationId,
        String email,
        UserRole role,
        String token,
        Instant expiresAt,
        InvitationStatus status
) {
}
