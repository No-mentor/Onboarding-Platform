package com.onboardos.onboarding.document;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.List;
import org.junit.jupiter.api.Test;

class PageChunkerTest {
    private final PageChunker chunker = new PageChunker();
    @Test void shortPageCreatesOneChunk() {
        assertThat(chunker.chunk(List.of(new PdfPageText(1, "short"))))
                .containsExactly(new PdfPageText(1, "short"));
    }
    @Test void longPagesSplitWithoutMixingPagesOrEmptyChunks() {
        List<PdfPageText> chunks = chunker.chunk(List.of(
                new PdfPageText(1, "가 ".repeat(900)), new PdfPageText(2, "second page")));
        assertThat(chunks.size()).isGreaterThan(2);
        assertThat(chunks).allSatisfy(c -> {
            assertThat(c.text()).isNotBlank(); assertThat(c.text().length()).isLessThanOrEqualTo(800);
        });
        assertThat(chunks.stream().filter(c -> c.page() == 2)).containsExactly(new PdfPageText(2, "second page"));
    }
    @Test void exactBoundaryAndVeryLongUnbrokenTextTerminate() {
        assertThat(chunker.chunk(List.of(new PdfPageText(1, "x".repeat(800))))).hasSize(1);
        assertThat(chunker.chunk(List.of(new PdfPageText(1, "x".repeat(8001))))).hasSize(11);
    }
}
