package com.onboardos.onboarding.global.exception;

import java.time.Instant;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ErrorResponse {
    private final Instant timestamp;
    private final int status;
    private final String error;
    private final String code;
    private final String message;
    private final String path;
    private final String traceId;
}
