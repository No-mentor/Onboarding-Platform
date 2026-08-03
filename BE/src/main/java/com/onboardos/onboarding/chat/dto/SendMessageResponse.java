package com.onboardos.onboarding.chat.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record SendMessageResponse(
        UUID sessionId,
        UUID messageId,
        String role,
        String answer,
        List<Map<String, Object>> citations,
        List<String> permissionDeniedDocumentIds,
        Instant createdAt
) {
}
