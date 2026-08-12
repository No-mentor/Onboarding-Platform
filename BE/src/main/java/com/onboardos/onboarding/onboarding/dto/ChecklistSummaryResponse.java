package com.onboardos.onboarding.onboarding.dto;

import com.onboardos.onboarding.domain.plan.ItemStatus;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

public record ChecklistSummaryResponse(
        List<ChecklistResponse> items,
        int total,
        long done,
        double progressPercent
) {
    public static ChecklistSummaryResponse from(List<ChecklistResponse> items) {
        long doneCount = items.stream().filter(i -> i.status() == ItemStatus.DONE).count();
        double progress = items.isEmpty()
                ? 0.0
                : BigDecimal.valueOf(doneCount * 100.0 / items.size())
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
        return new ChecklistSummaryResponse(items, items.size(), doneCount, progress);
    }
}
