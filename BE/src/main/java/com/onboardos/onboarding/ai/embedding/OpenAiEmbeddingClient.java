package com.onboardos.onboarding.ai.embedding;

import com.onboardos.onboarding.ai.AiProperties;
import dev.ai4j.openai4j.OpenAiHttpException;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.openai.OpenAiEmbeddingModel;
import dev.langchain4j.model.output.Response;
import jakarta.annotation.PostConstruct;
import java.time.Duration;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OpenAiEmbeddingClient implements EmbeddingClient {

    private final AiProperties properties;
    private EmbeddingModel embeddingModel;

    @PostConstruct
    void init() {
        if (!properties.isOpenAiReady()) {
            log.info("OpenAI Embedding client 비활성화 (AI_ENABLED=false 또는 API 키 없음) — 키워드 RAG fallback 사용");
            return;
        }
        embeddingModel = OpenAiEmbeddingModel.builder()
                .apiKey(properties.getOpenaiApiKey())
                .modelName(properties.getEmbeddingModel())
                .timeout(Duration.ofMillis(properties.getEmbeddingTimeoutMs()))
                .maxRetries(0)
                .build();
        log.info(
                "OpenAI Embedding client ready: model={}, timeoutMs={}",
                properties.getEmbeddingModel(),
                properties.getEmbeddingTimeoutMs()
        );
    }

    @Override
    public boolean isReady() {
        return embeddingModel != null;
    }

    @Override
    public List<float[]> embedAll(List<String> texts) {
        if (!isReady()) {
            return List.of();
        }
        if (texts == null || texts.isEmpty()) {
            return List.of();
        }

        List<TextSegment> segments = texts.stream().map(TextSegment::from).toList();
        try {
            Response<List<Embedding>> response = embeddingModel.embedAll(segments);
            return response.content().stream().map(Embedding::vector).toList();
        } catch (OpenAiHttpException e) {
            throw classify(e);
        } catch (Exception e) {
            throw new EmbeddingProviderException("임베딩 호출 중 오류가 발생했습니다.", e);
        }
    }

    static RuntimeException classify(OpenAiHttpException e) {
        if (e.code() == 401 || e.code() == 403) {
            return new EmbeddingConfigurationException(
                    "OpenAI 인증 실패(API 키를 확인하세요): HTTP " + e.code(), e
            );
        }
        return new EmbeddingProviderException("OpenAI 임베딩 호출 실패: HTTP " + e.code(), e);
    }
}