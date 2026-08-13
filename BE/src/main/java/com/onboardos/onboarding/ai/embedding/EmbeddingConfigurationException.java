package com.onboardos.onboarding.ai.embedding;

/**
 * API 키 누락/무효 등 설정 오류. 재시도해도 성공할 수 없는 경우.
 */
public class EmbeddingConfigurationException extends RuntimeException {

    public EmbeddingConfigurationException(String message, Throwable cause) {
        super(message, cause);
    }
}
