package com.onboardos.onboarding.chat;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class KoreanKeywordExtractorTest {
    private final KoreanKeywordExtractor extractor = new KoreanKeywordExtractor();

    @Test void removesCommonParticles() {
        assertThat(extractor.extract("마감일을 교육의 부서와 회사에서"))
                .containsExactly("마감일", "교육", "부서", "회사");
    }

    @Test void normalizesPunctuationWhitespaceAndRemovesStopWords() {
        assertThat(extractor.extract("  보안(교육)!!   마감일은, 언제야? 알려주세요. "))
                .containsExactly("보안", "교육", "마감일");
    }

    @Test void excludesSingleCharactersAndProtectsTokensThatWouldBecomeTooShort() {
        assertThat(extractor.extract("가 나를 팀은"))
                .containsExactly("나를", "팀은");
    }

    @Test void preservesOrderAndRemovesDuplicates() {
        assertThat(extractor.extract("교육의 교육은 마감일을 교육"))
                .containsExactly("교육", "마감일");
    }

    @Test void limitsKeywordCount() {
        String question = IntStream.range(0, KoreanKeywordExtractor.MAX_KEYWORDS + 3)
                .mapToObj(index -> "키워드" + index)
                .reduce((left, right) -> left + " " + right)
                .orElseThrow();
        assertThat(extractor.extract(question)).hasSize(KoreanKeywordExtractor.MAX_KEYWORDS);
    }

    @Test void handlesNullBlankAndPunctuationOnlyQuestions() {
        assertThat(extractor.extract(null)).isEmpty();
        assertThat(extractor.extract("  ")).isEmpty();
        assertThat(extractor.extract("?!(),.")).isEmpty();
    }
}
