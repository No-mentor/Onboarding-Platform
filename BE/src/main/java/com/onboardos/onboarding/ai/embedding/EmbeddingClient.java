package com.onboardos.onboarding.ai.embedding;

import java.util.List;

public interface EmbeddingClient {

    boolean isReady();

    /**
     * 하나의 요청으로 여러 텍스트를 임베딩한다(진짜 배치 호출).
     * isReady()==false면 호출하지 않아야 하며, 그 경우 빈 리스트를 반환한다.
     * 실패 시 전체 배치가 실패하며(부분 성공 없음) EmbeddingConfigurationException/EmbeddingProviderException을 던진다.
     */
    List<float[]> embedAll(List<String> texts);
}
