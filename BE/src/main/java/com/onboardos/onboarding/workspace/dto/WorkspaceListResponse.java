package com.onboardos.onboarding.workspace.dto;

import java.util.List;

public record WorkspaceListResponse(
        List<WorkspaceSummaryResponse> items
) {
}
