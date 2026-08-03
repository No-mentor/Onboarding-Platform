package com.onboardos.onboarding.chat.dto;

import java.time.Instant;
import java.util.UUID;

public record ChatSessionSummaryResponse(
        UUID id,
        String title,
        Instant updatedAt
) {
}
