package com.onboardos.onboarding.chat.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ChatMessageResponse(
        UUID id,
        String role,
        String content,
        List<Map<String, Object>> citations,
        Instant createdAt
) {
}
