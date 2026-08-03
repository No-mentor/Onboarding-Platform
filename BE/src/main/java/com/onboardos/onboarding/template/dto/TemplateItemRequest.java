package com.onboardos.onboarding.template.dto;

import com.onboardos.onboarding.domain.plan.PlanItemType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record TemplateItemRequest(
        @NotNull @Min(1) @Max(30) Integer dayIndex,
        @NotNull PlanItemType type,
        @NotBlank String title,
        String description,
        Integer sortOrder
) {
}
