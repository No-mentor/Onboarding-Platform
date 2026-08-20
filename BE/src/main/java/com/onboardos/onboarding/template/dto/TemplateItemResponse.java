package com.onboardos.onboarding.template.dto;

import com.onboardos.onboarding.domain.plan.PlanItemType;
import com.onboardos.onboarding.domain.template.OnboardingTemplateItem;
import java.util.UUID;

public record TemplateItemResponse(
        UUID id,
        int dayIndex,
        PlanItemType type,
        String title,
        String description,
        int sortOrder,
        UUID documentId,
        Integer estimatedMinutes
) {
    public static TemplateItemResponse from(OnboardingTemplateItem i) {
        return new TemplateItemResponse(
                i.getId(), i.getDayIndex(), i.getType(), i.getTitle(), i.getDescription(), i.getSortOrder(),
                i.getDocumentId(), i.getEstimatedMinutes()
        );
    }
}
