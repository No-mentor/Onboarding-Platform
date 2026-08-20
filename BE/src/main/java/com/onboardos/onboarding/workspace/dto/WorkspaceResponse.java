package com.onboardos.onboarding.workspace.dto;

import java.time.Instant;
import java.util.UUID;

public record WorkspaceResponse(
        UUID id,
        String name,
        String slug,
        Instant createdAt
) {
}
