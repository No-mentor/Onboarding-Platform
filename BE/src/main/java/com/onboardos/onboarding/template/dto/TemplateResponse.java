package com.onboardos.onboarding.template.dto;

import com.onboardos.onboarding.domain.template.OnboardingTemplate;
import com.onboardos.onboarding.domain.user.UserRole;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TemplateResponse(
        UUID id,
        String name,
        UserRole targetRole,
        String description,
        boolean isDefault,
        Instant updatedAt,
        List<TemplateItemResponse> items
) {
    public static TemplateResponse of(OnboardingTemplate t, List<TemplateItemResponse> items) {
        return new TemplateResponse(
                t.getId(),
                t.getName(),
                t.getTargetRole(),
                t.getDescription(),
                t.isDefault(),
                t.getUpdatedAt(),
                items
        );
    }
}
