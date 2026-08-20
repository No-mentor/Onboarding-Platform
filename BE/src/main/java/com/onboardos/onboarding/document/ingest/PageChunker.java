package com.onboardos.onboarding.document.ingest;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;
@Component
public class PageChunker {
    public static final int DEFAULT_MAX_CHARS = 800;
    public List<PdfPageText> chunk(List<PdfPageText> pages) {
        List<PdfPageText> result = new ArrayList<>();
        for (PdfPageText page : pages) split(page, result);
        return result;
    }
    private void split(PdfPageText page, List<PdfPageText> result) {
        String text = page.text().trim(); int start = 0;
        while (start < text.length()) {
            int hardEnd = Math.min(start + DEFAULT_MAX_CHARS, text.length()); int end = hardEnd;
            if (hardEnd < text.length()) {
                int boundary = Math.max(text.lastIndexOf('\n', hardEnd), text.lastIndexOf(' ', hardEnd));
                if (boundary > start) end = boundary;
            }
            String value = text.substring(start, end).trim();
            if (!value.isEmpty()) result.add(new PdfPageText(page.page(), value));
            start = end;
            while (start < text.length() && Character.isWhitespace(text.charAt(start))) start++;
        }
    }
}
