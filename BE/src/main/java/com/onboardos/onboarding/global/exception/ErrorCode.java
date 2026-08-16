package com.onboardos.onboarding.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    DOCUMENT_STORAGE_CONFIGURATION_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "DOCUMENT_STORAGE_CONFIGURATION_ERROR", "문서 저장소 설정이 올바르지 않습니다."),
    DOCUMENT_STORAGE_ERROR(HttpStatus.BAD_GATEWAY, "DOCUMENT_STORAGE_ERROR", "문서 저장소 요청에 실패했습니다."),
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "요청 값이 올바르지 않습니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "인증이 필요하거나 토큰이 유효하지 않습니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "FORBIDDEN", "권한이 없습니다."),
    DOCUMENT_ACCESS_DENIED(HttpStatus.FORBIDDEN, "DOCUMENT_ACCESS_DENIED", "해당 문서에 접근 권한이 없습니다."),
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", "리소스를 찾을 수 없습니다."),
    CONFLICT(HttpStatus.CONFLICT, "CONFLICT", "이미 존재하는 리소스입니다."),
    GONE(HttpStatus.GONE, "GONE", "만료되었거나 더 이상 유효하지 않습니다."),
    WORKSPACE_MISMATCH(HttpStatus.FORBIDDEN, "WORKSPACE_MISMATCH", "워크스페이스 접근 권한이 없습니다."),
    DOCUMENT_NOT_READY(HttpStatus.CONFLICT, "DOCUMENT_NOT_READY", "문서 처리가 아직 완료되지 않았습니다."),
    EMAIL_NOT_VERIFIED(HttpStatus.FORBIDDEN, "EMAIL_NOT_VERIFIED", "이메일 인증이 완료되지 않았습니다."),
    VERIFICATION_CODE_INVALID(HttpStatus.BAD_REQUEST, "VERIFICATION_CODE_INVALID", "인증 코드가 올바르지 않습니다."),
    VERIFICATION_CODE_EXPIRED(HttpStatus.GONE, "VERIFICATION_CODE_EXPIRED", "인증 코드가 만료되었습니다. 재발송을 요청해주세요."),
    VERIFICATION_MAX_ATTEMPTS(HttpStatus.BAD_REQUEST, "VERIFICATION_MAX_ATTEMPTS", "인증 시도 횟수를 초과했습니다. 코드를 재발송해주세요."),
    RESEND_TOO_FREQUENT(HttpStatus.TOO_MANY_REQUESTS, "RESEND_TOO_FREQUENT", "재발송 요청이 너무 빈번합니다. 잠시 후 다시 시도해주세요."),
    AI_PROVIDER_ERROR(HttpStatus.SERVICE_UNAVAILABLE, "AI_PROVIDER_ERROR", "AI 제공자 오류로 답변을 생성할 수 없습니다."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "서버 오류가 발생했습니다.");

    private final HttpStatus status;
    private final String code;
    private final String defaultMessage;
}
