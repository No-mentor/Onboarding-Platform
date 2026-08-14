package com.onboardos.onboarding.document;
public class PdfExtractionException extends RuntimeException {
    public PdfExtractionException(Throwable cause) { super("PDF text extraction failed", cause); }
}
