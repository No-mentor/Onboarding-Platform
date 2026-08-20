package com.onboardos.onboarding.template.dto;

import com.onboardos.onboarding.domain.plan.PlanItemType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.UUID;

public record TemplateItemRequest(
        @NotNull @Min(1) @Max(30) Integer dayIndex,
        @NotNull PlanItemType type,
        @NotBlank String title,
        String description,
        Integer sortOrder,
        UUID documentId,
        @PositiveOrZero Integer estimatedMinutes
) {
    public TemplateItemRequest(Integer dayIndex, PlanItemType type, String title, String description, Integer sortOrder) {
        this(dayIndex, type, title, description, sortOrder, null, null);
    }
}
