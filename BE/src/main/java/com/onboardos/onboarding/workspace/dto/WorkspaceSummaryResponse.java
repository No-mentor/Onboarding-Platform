package com.onboardos.onboarding.workspace.dto;

import com.onboardos.onboarding.domain.user.UserRole;
import java.util.UUID;

public record WorkspaceSummaryResponse(
        UUID id,
        String name,
        String slug,
        UserRole role
) {
}
