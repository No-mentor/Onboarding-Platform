package com.onboardos.onboarding.auth.dto;

public record SignupResponse(
        String email,
        String message,
        boolean emailSent
) {
    public static SignupResponse success(String email) {
        return new SignupResponse(email, "인증 코드가 발송되었습니다. 이메일을 확인해주세요.", true);
    }

    public static SignupResponse mailFailed(String email) {
        return new SignupResponse(email, "회원가입은 완료되었으나 인증 코드 발송에 실패했습니다. 재발송을 시도해주세요.", false);
    }
}
