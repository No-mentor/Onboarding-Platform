package com.onboardos.onboarding.ai.embedding;

/**
 * 네트워크 오류, 타임아웃, 5xx/429 등 일시적 장애. 재시도로 성공할 수 있는 경우.
 */
public class EmbeddingProviderException extends RuntimeException {

    public EmbeddingProviderException(String message, Throwable cause) {
        super(message, cause);
    }
}