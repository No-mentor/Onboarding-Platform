package com.onboardos.onboarding.document.ingest;
public class PdfExtractionException extends RuntimeException {
    public PdfExtractionException(Throwable cause) { super("PDF text extraction failed", cause); }
}
