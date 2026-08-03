package com.onboardos.onboarding.workspace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateWorkspaceRequest(
        @NotBlank @Size(max = 200) String name
) {
}
