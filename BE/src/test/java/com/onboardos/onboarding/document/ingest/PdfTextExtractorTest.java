package com.onboardos.onboarding.document.ingest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import java.util.List;
import org.junit.jupiter.api.Test;

class PdfTextExtractorTest {
    private final PdfTextExtractor extractor = new PdfTextExtractor();

    @Test void extractsSinglePage() throws Exception {
        assertThat(extractor.extract(PdfTestSupport.pdf("hello pdf")))
                .containsExactly(new PdfPageText(1, "hello pdf"));
    }
    @Test void preservesPageNumbersAndSkipsBlankPages() throws Exception {
        List<PdfPageText> pages = extractor.extract(PdfTestSupport.pdf("first", "", "third"));
        assertThat(pages).containsExactly(new PdfPageText(1, "first"), new PdfPageText(3, "third"));
    }
    @Test void rejectsCorruptPdfSafely() {
        assertThatThrownBy(() -> extractor.extract("not a pdf".getBytes())).isInstanceOf(PdfExtractionException.class)
                .hasMessage("PDF text extraction failed").hasMessageNotContaining("not a pdf");
    }
    @Test void rejectsPasswordProtectedPdf() throws Exception {
        assertThatThrownBy(() -> extractor.extract(PdfTestSupport.encryptedPdf())).isInstanceOf(PdfExtractionException.class);
    }
    @Test void returnsNoPagesWhenPdfHasNoExtractableText() throws Exception {
        assertThat(extractor.extract(PdfTestSupport.pdf(""))).isEmpty();
    }
    @Test void normalizesWhitespaceWithoutDamagingKorean() {
        assertThat(PdfTextExtractor.normalize("  한글   문장\r\n\r\n\r\n 다음 줄  ")).isEqualTo("한글 문장\n\n다음 줄");
    }
}
