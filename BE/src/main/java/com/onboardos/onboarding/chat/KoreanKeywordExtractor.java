package com.onboardos.onboarding.chat;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class KoreanKeywordExtractor {
    public static final int MAX_KEYWORDS = 8;

    private static final List<String> PARTICLES = List.of(
            "으로", "에서", "부터", "까지",
            "은", "는", "이", "가", "을", "를", "의", "와", "과", "에", "로", "도", "만"
    );
    private static final Set<String> STOP_WORDS = Set.of(
            "알려줘", "알려주세요", "무엇", "뭐야", "어디", "어디야",
            "언제", "언제야", "어떻게", "대해"
    );

    public List<String> extract(String question) {
        if (question == null || question.isBlank()) {
            return List.of();
        }
        String normalized = question.replaceAll("[\\p{P}\\p{S}]", " ").trim();
        if (normalized.isEmpty()) {
            return List.of();
        }

        LinkedHashSet<String> keywords = new LinkedHashSet<>();
        for (String token : normalized.split("\\s+")) {
            if (token.length() < 2 || STOP_WORDS.contains(token)) {
                continue;
            }
            String keyword = removeParticle(token);
            if (keyword.length() >= 2 && !STOP_WORDS.contains(keyword)) {
                keywords.add(keyword);
            }
            if (keywords.size() == MAX_KEYWORDS) {
                break;
            }
        }
        return new ArrayList<>(keywords);
    }

    private String removeParticle(String token) {
        for (String particle : PARTICLES) {
            if (token.endsWith(particle)) {
                String stem = token.substring(0, token.length() - particle.length());
                return stem.length() >= 2 ? stem : token;
            }
        }
        return token;
    }
}
