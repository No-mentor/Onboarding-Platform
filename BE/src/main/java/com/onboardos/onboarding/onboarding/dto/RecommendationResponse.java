package com.onboardos.onboarding.onboarding.dto;

import com.onboardos.onboarding.domain.plan.DailyRecommendation;
import com.onboardos.onboarding.domain.plan.ItemStatus;
import com.onboardos.onboarding.domain.plan.PlanItemType;
import java.util.UUID;

public record RecommendationResponse(
        UUID id,
        PlanItemType type,
        String title,
        ItemStatus status,
        int priority,
        String source,
        UUID planItemId,
        UUID documentId,
        String personName
) {
    public static RecommendationResponse from(DailyRecommendation r) {
        return new RecommendationResponse(
                r.getId(),
                r.getType(),
                r.getTitle(),
                r.getStatus(),
                r.getPriority(),
                r.getSource(),
                r.getPlanItemId(),
                r.getDocumentId(),
                r.getPersonName()
        );
    }
}
