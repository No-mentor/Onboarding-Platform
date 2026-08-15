package com.onboardos.onboarding.document.validation;

import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class DocumentUploadValidator {

    static final long MAX_FILE_SIZE = 20L * 1024 * 1024;
    private static final byte[] PDF_SIGNATURE = "%PDF-".getBytes(StandardCharsets.US_ASCII);

    public void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            invalid("PDF 파일이 비어 있습니다.");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            invalid("PDF 파일은 20MB를 초과할 수 없습니다.");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.toLowerCase(java.util.Locale.ROOT).endsWith(".pdf")) {
            invalid("확장자가 .pdf인 파일만 업로드할 수 있습니다.");
        }
        if (!MediaType.APPLICATION_PDF_VALUE.equalsIgnoreCase(file.getContentType())) {
            invalid("Content-Type이 application/pdf인 파일만 업로드할 수 있습니다.");
        }

        try (InputStream input = file.getInputStream()) {
            if (!Arrays.equals(input.readNBytes(PDF_SIGNATURE.length), PDF_SIGNATURE)) {
                invalid("올바른 PDF 파일 시그니처가 아닙니다.");
            }
        } catch (IOException e) {
            invalid("PDF 파일을 검증할 수 없습니다.");
        }
    }

    private void invalid(String message) {
        throw new BusinessException(ErrorCode.VALIDATION_ERROR, message);
    }
}
