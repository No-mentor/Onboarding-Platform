package com.onboardos.onboarding.member.dto;

import com.onboardos.onboarding.domain.user.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CreateInvitationRequest(
        @NotBlank @Email String email,
        UserRole role,
        String department,
        String careerLevel,
        String title
) {
}
