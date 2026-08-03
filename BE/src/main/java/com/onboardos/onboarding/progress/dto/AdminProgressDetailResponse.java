package com.onboardos.onboarding.progress.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record AdminProgressDetailResponse(
        UUID userId,
        String name,
        String email,
        BigDecimal progressPercent,
        UUID planId,
        List<MyProgressResponse.OverdueItem> overdueItems,
        String insights
) {
}
