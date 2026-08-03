package com.onboardos.onboarding.member.dto;

import com.onboardos.onboarding.domain.user.UserRole;
import java.util.UUID;

public record AcceptInvitationResponse(
        UUID workspaceId,
        UserRole role,
        UUID membershipId,
        UUID onboardingPlanId
) {
}
