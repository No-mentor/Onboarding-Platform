package com.onboardos.onboarding.template.dto;

import com.onboardos.onboarding.domain.user.UserRole;
import jakarta.validation.Valid;
import java.util.List;

public record UpdateTemplateRequest(
        String name,
        UserRole targetRole,
        String description,
        Boolean isDefault,
        @Valid List<TemplateItemRequest> items
) {
}
