package com.onboardos.onboarding.onboarding.dto;

import com.onboardos.onboarding.domain.plan.PlanStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PlanResponse(
        UUID planId,
        UUID userId,
        PlanStatus status,
        int version,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal progressPercent,
        int itemCount,
        List<PlanItemResponse> items
) {
}
