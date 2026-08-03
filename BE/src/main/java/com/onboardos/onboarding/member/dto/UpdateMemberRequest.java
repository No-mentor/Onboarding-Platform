package com.onboardos.onboarding.member.dto;

import com.onboardos.onboarding.domain.user.MembershipStatus;
import com.onboardos.onboarding.domain.user.UserRole;

public record UpdateMemberRequest(
        UserRole role,
        MembershipStatus status
) {
}
