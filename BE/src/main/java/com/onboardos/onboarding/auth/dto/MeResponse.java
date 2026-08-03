package com.onboardos.onboarding.auth.dto;

import com.onboardos.onboarding.workspace.dto.WorkspaceSummaryResponse;
import java.util.List;
import java.util.UUID;

public record MeResponse(
        UUID id,
        String email,
        String name,
        WorkspaceSummaryResponse currentWorkspace,
        List<WorkspaceSummaryResponse> workspaces
) {
}
