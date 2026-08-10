package com.onboardos.onboarding.document;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

class DocumentUploadValidatorTest {
    private final DocumentUploadValidator validator = new DocumentUploadValidator();

    @Test void rejectsEmptyFile() {
        assertInvalid(pdf("empty.pdf", new byte[0]));
    }

    @Test void rejectsFileLargerThanTwentyMegabytes() {
        byte[] bytes = pdfBytes((int) DocumentUploadValidator.MAX_FILE_SIZE + 1);
        assertInvalid(pdf("large.pdf", bytes));
    }

    @Test void acceptsFileExactlyTwentyMegabytes() {
        byte[] bytes = pdfBytes((int) DocumentUploadValidator.MAX_FILE_SIZE);
        assertThatCode(() -> validator.validate(pdf("exact.PDF", bytes))).doesNotThrowAnyException();
    }

    @Test void rejectsNonPdfExtension() {
        assertInvalid(new MockMultipartFile("file", "guide.txt", MediaType.APPLICATION_PDF_VALUE, pdfBytes(10)));
    }

    @Test void rejectsNonPdfMimeType() {
        assertInvalid(new MockMultipartFile("file", "guide.pdf", MediaType.TEXT_PLAIN_VALUE, pdfBytes(10)));
    }

    @Test void rejectsMissingPdfSignature() {
        assertInvalid(pdf("guide.pdf", "not-a-pdf".getBytes()));
    }

    @Test void acceptsValidPdf() {
        assertThatCode(() -> validator.validate(pdf("guide.pdf", pdfBytes(10)))).doesNotThrowAnyException();
    }

    private void assertInvalid(MockMultipartFile file) {
        assertThatThrownBy(() -> validator.validate(file))
                .isInstanceOfSatisfying(BusinessException.class,
                        ex -> org.assertj.core.api.Assertions.assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
    }

    private MockMultipartFile pdf(String name, byte[] bytes) {
        return new MockMultipartFile("file", name, MediaType.APPLICATION_PDF_VALUE, bytes);
    }

    private byte[] pdfBytes(int size) {
        byte[] bytes = new byte[size];
        byte[] signature = "%PDF-".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        System.arraycopy(signature, 0, bytes, 0, Math.min(signature.length, size));
        if (size > signature.length) Arrays.fill(bytes, signature.length, size, (byte) '0');
        return bytes;
    }
}
