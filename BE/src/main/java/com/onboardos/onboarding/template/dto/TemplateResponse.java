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
        int itemCount,
        long documentCount,
        long personCount,
        long checklistCount,
        long practiceCount,
        int totalEstimatedMinutes,
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
                items.size(),
                items.stream().filter(i -> i.type() == com.onboardos.onboarding.domain.plan.PlanItemType.DOCUMENT).count(),
                items.stream().filter(i -> i.type() == com.onboardos.onboarding.domain.plan.PlanItemType.PERSON).count(),
                items.stream().filter(i -> i.type() == com.onboardos.onboarding.domain.plan.PlanItemType.CHECKLIST).count(),
                items.stream().filter(i -> i.type() == com.onboardos.onboarding.domain.plan.PlanItemType.PRACTICE).count(),
                items.stream().map(TemplateItemResponse::estimatedMinutes).filter(java.util.Objects::nonNull)
                        .mapToInt(Integer::intValue).sum(),
                items
        );
    }
}
