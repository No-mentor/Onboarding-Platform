package com.onboardos.onboarding.chat.dto;

import java.util.List;
import java.util.UUID;

public record ChatSessionDetailResponse(
        UUID id,
        List<ChatMessageResponse> messages
) {
}
