package com.onboardos.onboarding.ai;

import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.openai.OpenAiEmbeddingModel;
import jakarta.annotation.PostConstruct;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmbeddingService {

    private final AiProperties aiProperties;
    private EmbeddingModel embeddingModel;

    @PostConstruct
    void init() {
        if (aiProperties.isOpenAiReady()) {
            embeddingModel = OpenAiEmbeddingModel.builder()
                    .apiKey(aiProperties.getOpenaiApiKey())
                    .modelName(aiProperties.getEmbeddingModel())
                    .build();
            log.info("OpenAI Embedding model ready: {}", aiProperties.getEmbeddingModel());
        } else {
            log.info("AI embedding disabled — keyword RAG fallback 사용");
        }
    }

    public boolean isEnabled() {
        return embeddingModel != null;
    }

    public float[] embed(String text) {
        if (!isEnabled() || text == null || text.isBlank()) {
            return null;
        }
        Embedding embedding = embeddingModel.embed(text).content();
        return embedding.vector();
    }

    public String toPgVectorLiteral(float[] vector) {
        if (vector == null || vector.length == 0) {
            return null;
        }
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append(vector[i]);
        }
        sb.append(']');
        return sb.toString();
    }

    public List<float[]> embedAll(List<String> texts) {
        return texts.stream().map(this::embed).toList();
    }
}
