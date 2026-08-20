package com.onboardos.onboarding.template.dto;

import java.util.List;
import java.util.UUID;

public record AffectedUsersResponse(
        int count,
        List<AffectedUserSummary> users
) {
    public record AffectedUserSummary(UUID userId, UUID planId, String email, String name) {}
}
