package com.onboardos.onboarding.progress.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record AdminProgressItemResponse(
        UUID userId,
        String name,
        String email,
        BigDecimal progressPercent,
        String status,
        UUID planId,
        int currentDay
) {
}
