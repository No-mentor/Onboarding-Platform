package com.onboardos.onboarding.onboarding.dto;

import com.onboardos.onboarding.domain.plan.ChecklistItem;
import com.onboardos.onboarding.domain.plan.ItemStatus;
import java.time.Instant;
import java.util.UUID;

public record ChecklistResponse(
        UUID id,
        String title,
        ItemStatus status,
        Integer dueDay,
        Instant completedAt
) {
    public static ChecklistResponse from(ChecklistItem c) {
        return new ChecklistResponse(c.getId(), c.getTitle(), c.getStatus(), c.getDueDay(), c.getCompletedAt());
    }
}
