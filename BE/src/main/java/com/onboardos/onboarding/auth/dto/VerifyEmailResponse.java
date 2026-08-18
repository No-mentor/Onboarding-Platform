package com.onboardos.onboarding.auth.dto;

public record VerifyEmailResponse(
        String email,
        String message
) {
    public static VerifyEmailResponse success(String email) {
        return new VerifyEmailResponse(email, "이메일 인증이 완료되었습니다. 로그인해주세요.");
    }
}
