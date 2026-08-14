package com.onboardos.onboarding.document;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;
@Component
public class PdfTextExtractor {
    public List<PdfPageText> extract(byte[] bytes) {
        if (bytes == null || bytes.length == 0) throw new PdfExtractionException(null);
        try (PDDocument document = Loader.loadPDF(bytes)) {
            if (!document.getCurrentAccessPermission().canExtractContent()) throw new PdfExtractionException(null);
            PDFTextStripper stripper = new PDFTextStripper();
            List<PdfPageText> pages = new ArrayList<>();
            for (int page = 1; page <= document.getNumberOfPages(); page++) {
                stripper.setStartPage(page); stripper.setEndPage(page);
                String text = normalize(stripper.getText(document));
                if (!text.isBlank()) pages.add(new PdfPageText(page, text));
            }
            return pages;
        } catch (IOException | RuntimeException e) {
            if (e instanceof PdfExtractionException pe) throw pe;
            throw new PdfExtractionException(e);
        }
    }
    static String normalize(String text) {
        if (text == null) return "";
        return text.replace("\r\n", "\n").replace('\r', '\n').lines()
                .map(line -> line.trim().replaceAll("[\\t\\x0B\\f ]+", " "))
                .reduce((a, b) -> a + "\n" + b).orElse("")
                .replaceAll("\\n{3,}", "\n\n").trim();
    }
}
