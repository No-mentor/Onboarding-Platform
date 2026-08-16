package com.onboardos.onboarding.auth.dto;

public record ResendVerificationResponse(
        String message
) {
    public static ResendVerificationResponse success() {
        return new ResendVerificationResponse("등록된 이메일이라면 인증 코드가 발송됩니다.");
    }
}
