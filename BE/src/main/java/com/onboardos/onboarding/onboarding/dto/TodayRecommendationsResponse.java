package com.onboardos.onboarding.onboarding.dto;

import java.time.LocalDate;
import java.util.List;

public record TodayRecommendationsResponse(
        LocalDate date,
        List<RecommendationResponse> items
) {
}
