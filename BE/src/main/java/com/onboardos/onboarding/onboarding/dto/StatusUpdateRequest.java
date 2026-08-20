package com.onboardos.onboarding.onboarding.dto;

import com.onboardos.onboarding.domain.plan.ItemStatus;
import jakarta.validation.constraints.NotNull;

public record StatusUpdateRequest(
        @NotNull ItemStatus status
) {
}
