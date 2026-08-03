package com.onboardos.onboarding.workspace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateWorkspaceRequest(
        @NotBlank @Size(max = 200) String name,
        @NotBlank
        @Size(min = 2, max = 80)
        @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$", message = "slug는 소문자·숫자·하이픈만 허용됩니다")
        String slug
) {
}
