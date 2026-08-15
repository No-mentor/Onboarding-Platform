package com.onboardos.onboarding.onboarding.dto;

import com.onboardos.onboarding.domain.plan.ItemStatus;
import com.onboardos.onboarding.domain.plan.OnboardingPlanItem;
import com.onboardos.onboarding.domain.plan.PlanItemType;
import java.time.Instant;
import java.util.UUID;

public record PlanItemResponse(
        UUID id,
        int dayIndex,
        PlanItemType type,
        String title,
        String description,
        ItemStatus status,
        UUID documentId,
        String personName,
        Integer estimatedMinutes,
        Instant completedAt
) {
    public static PlanItemResponse from(OnboardingPlanItem i) {
        return new PlanItemResponse(
                i.getId(),
                i.getDayIndex(),
                i.getType(),
                i.getTitle(),
                i.getDescription(),
                i.getStatus(),
                i.getDocumentId(),
                i.getPersonName(),
                i.getEstimatedMinutes(),
                i.getCompletedAt()
        );
    }
}
