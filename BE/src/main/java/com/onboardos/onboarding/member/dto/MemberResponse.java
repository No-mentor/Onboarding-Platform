package com.onboardos.onboarding.member.dto;

import com.onboardos.onboarding.domain.user.MembershipStatus;
import com.onboardos.onboarding.domain.user.UserRole;
import java.util.UUID;

public record MemberResponse(
        UUID id,
        UUID userId,
        String name,
        String email,
        UserRole role,
        MembershipStatus status,
        String department,
        String careerLevel,
        String title
) {
}
