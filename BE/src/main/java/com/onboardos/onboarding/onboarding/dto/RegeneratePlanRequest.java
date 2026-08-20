package com.onboardos.onboarding.onboarding.dto;

import java.util.UUID;

public record RegeneratePlanRequest(UUID templateId, Boolean preserveCompleted) {
}
