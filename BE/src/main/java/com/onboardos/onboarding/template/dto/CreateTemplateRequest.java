package com.onboardos.onboarding.template.dto;

import com.onboardos.onboarding.domain.user.UserRole;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateTemplateRequest(
        @NotBlank @Size(max = 200) String name,
        UserRole targetRole,
        String description,
        Boolean isDefault,
        @Valid List<TemplateItemRequest> items
) {
}
