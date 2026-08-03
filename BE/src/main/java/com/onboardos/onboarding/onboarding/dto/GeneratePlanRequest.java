package com.onboardos.onboarding.onboarding.dto;

import java.util.UUID;

public record GeneratePlanRequest(
        UUID userId,
        UUID templateId,
        boolean force
) {
}
