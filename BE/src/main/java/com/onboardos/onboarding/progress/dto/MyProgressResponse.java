package com.onboardos.onboarding.progress.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record MyProgressResponse(
        BigDecimal progressPercent,
        long completedItems,
        long totalItems,
        List<OverdueItem> overdueItems,
        List<String> bottlenecks
) {
    public record OverdueItem(UUID id, String title, int dayIndex) {
    }
}
