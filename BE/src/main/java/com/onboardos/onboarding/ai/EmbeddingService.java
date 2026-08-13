package com.onboardos.onboarding.ai;

import com.onboardos.onboarding.ai.embedding.EmbeddingClient;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmbeddingService {

    private final EmbeddingClient embeddingClient;

    public boolean isEnabled() {
        return embeddingClient.isReady();
    }

    public float[] embed(String text) {
        if (!isEnabled() || text == null || text.isBlank()) {
            return null;
        }
        List<float[]> result = embeddingClient.embedAll(List.of(text));
        return result.isEmpty() ? null : result.get(0);
    }

    /**
     * 공백/빈 문자열은 배치 호출에서 제외하고 해당 위치에 null을 채워 순서를 유지한다
     * (OpenAI 배치 API는 원소 하나가 비어 있어도 요청 전체가 실패할 수 있어서, 이 필터링이
     * 여러 청크 중 일부만 빈 값인 흔한 경우까지 배치 실패로 만들지 않게 해준다).
     */
    public List<float[]> embedAll(List<String> texts) {
        if (!isEnabled() || texts == null || texts.isEmpty()) {
            return List.of();
        }

        List<Integer> nonBlankIndexes = new ArrayList<>();
        List<String> nonBlankTexts = new ArrayList<>();
        for (int i = 0; i < texts.size(); i++) {
            String text = texts.get(i);
            if (text != null && !text.isBlank()) {
                nonBlankIndexes.add(i);
                nonBlankTexts.add(text);
            }
        }

        float[][] results = new float[texts.size()][];
        if (!nonBlankTexts.isEmpty()) {
            List<float[]> embedded = embeddingClient.embedAll(nonBlankTexts);
            for (int i = 0; i < nonBlankIndexes.size(); i++) {
                results[nonBlankIndexes.get(i)] = embedded.get(i);
            }
        }
        return Arrays.asList(results);
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
}