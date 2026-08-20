package com.onboardos.onboarding.dashboard.dto;

import com.onboardos.onboarding.domain.plan.PlanStatus;
import com.onboardos.onboarding.onboarding.dto.RecommendationResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record DashboardResponse(
        BigDecimal progressPercent,
        TodayBlock today,
        PlanBlock plan,
        ChecklistBlock checklist,
        String message
) {
    public record TodayBlock(int total, int done, List<RecommendationResponse> items) {
    }

    public record PlanBlock(UUID planId, int currentDay, int totalDays, PlanStatus status) {
    }

    public record ChecklistBlock(int total, int done) {
    }
}
