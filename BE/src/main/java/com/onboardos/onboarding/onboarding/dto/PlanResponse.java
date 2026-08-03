package com.onboardos.onboarding.onboarding.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PlanResponse(
        UUID planId,
        String status,
        int version,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal progressPercent,
        List<PlanItemResponse> items
) {
}
