package com.onboardos.onboarding.auth.dto;

import com.onboardos.onboarding.workspace.dto.WorkspaceSummaryResponse;
import java.util.List;
import java.util.UUID;

public record MeResponse(
        UUID id,
        String email,
        String name,
        WorkspaceSummaryResponse currentWorkspace,
        ProfileResponse profile,
        List<WorkspaceSummaryResponse> workspaces
) {
    public record ProfileResponse(
            String department,
            String careerLevel,
            String title
    ) {
    }
}
