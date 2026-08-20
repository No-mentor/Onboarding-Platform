package com.onboardos.onboarding.chat.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record SendMessageRequest(
        UUID sessionId,
        @NotBlank String message,
        Boolean stream
) {
}
