package com.onboardos.onboarding.auth.dto;

import com.onboardos.onboarding.workspace.dto.WorkspaceSummaryResponse;
import java.util.List;
import java.util.UUID;

public record AuthResponse(
        UUID userId,
        String email,
        String name,
        String accessToken,
        String tokenType,
        long expiresIn,
        List<WorkspaceSummaryResponse> workspaces
) {
    public static AuthResponse of(
            UUID userId,
            String email,
            String name,
            String accessToken,
            long expiresIn,
            List<WorkspaceSummaryResponse> workspaces
    ) {
        return new AuthResponse(userId, email, name, accessToken, "Bearer", expiresIn, workspaces);
    }
}
