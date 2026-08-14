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
            if (properties.isEnabled()) {
                log.warn("OpenAI Embedding client disabled because OPENAI_API_KEY is not configured");
            } else {
                log.info("OpenAI Embedding client disabled; keyword fallback is active");
            }
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
            List<float[]> vectors = response.content().stream().map(Embedding::vector).toList();
            validateDimensions(vectors, properties.getEmbeddingDimension());
            return vectors;
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

    static void validateDimensions(List<float[]> vectors, int expectedDimension) {
        for (float[] vector : vectors) {
            if (vector == null || vector.length != expectedDimension) {
                throw new EmbeddingConfigurationException(
                        "Embedding dimension does not match configured storage dimension", null);
            }
        }
    }
}
