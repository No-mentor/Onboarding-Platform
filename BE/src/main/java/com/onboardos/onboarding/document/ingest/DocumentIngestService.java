package com.onboardos.onboarding.document.ingest;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import com.onboardos.onboarding.ai.EmbeddingService;
import com.onboardos.onboarding.ai.embedding.EmbeddingConfigurationException;
import com.onboardos.onboarding.ai.embedding.EmbeddingProviderException;
import com.onboardos.onboarding.document.search.DocumentChunkVectorRepository;
import com.onboardos.onboarding.document.storage.DocumentStorage;
import com.onboardos.onboarding.domain.document.DocumentChunk;
import com.onboardos.onboarding.domain.document.DocumentChunkRepository;
import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j @Service @RequiredArgsConstructor
public class DocumentIngestService {
    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentChunkVectorRepository vectorRepository;
    private final DocumentStorage storageService;
    private final EmbeddingService embeddingService;
    private final PdfTextExtractor pdfTextExtractor;
    private final PageChunker pageChunker;
    private final ObjectMapper objectMapper;

    @Async @Transactional public void processAsync(UUID documentId) { process(documentId); }

    @Transactional
    public void process(UUID documentId) {
        DocumentEntity doc = documentRepository.findById(documentId).orElse(null);
        if (doc == null || doc.isDeleted()) return;
        Integer failedChunkIndex = null;
        try {
            doc.markProcessing(); documentRepository.save(doc);
            documentChunkRepository.deleteByDocumentId(documentId);
            documentChunkRepository.flush();
            List<PdfPageText> parts = pageChunker.chunk(pdfTextExtractor.extract(storageService.read(doc.getStorageKey())));
            if (parts.isEmpty()) throw new PdfExtractionException(null);
            List<DocumentChunk> chunks = new ArrayList<>();
            for (int i = 0; i < parts.size(); i++) {
                PdfPageText part = parts.get(i);
                chunks.add(DocumentChunk.create(documentId, doc.getWorkspaceId(), i, part.text(), metadata(part.page())));
            }
            documentChunkRepository.saveAll(chunks);
            if (embeddingService.isEnabled()) {
                for (DocumentChunk chunk : chunks) {
                    failedChunkIndex = chunk.getChunkIndex();
                    String literal = embeddingService.toPgVectorLiteral(embeddingService.embed(chunk.getContent()));
                    if (literal == null) {
                        throw new EmbeddingProviderException("Embedding result was unavailable", null);
                    }
                    vectorRepository.updateEmbedding(chunk.getId(), literal);
                }
                failedChunkIndex = null;
            }
            doc.markReady(chunks.size()); documentRepository.save(doc);
            log.info("Document ingested: documentId={}, chunks={}", documentId, chunks.size());
        } catch (EmbeddingConfigurationException e) {
            fail(doc, documentId, e, failedChunkIndex, "임베딩 설정 오류로 문서를 처리하지 못했습니다.");
        } catch (EmbeddingProviderException e) {
            fail(doc, documentId, e, failedChunkIndex, "임베딩 서비스 오류로 문서를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        } catch (Exception e) {
            fail(doc, documentId, e, failedChunkIndex, "PDF 문서를 처리하지 못했습니다. 파일을 확인해 주세요.");
        }
    }

    private void fail(DocumentEntity doc, UUID id, Exception e, Integer index, String message) {
        log.error("Document ingest failed: documentId={}, type={}, failedChunkIndex={}", id, e.getClass().getSimpleName(), index);
        doc.markFailed(message); documentRepository.save(doc);
    }

    private String metadata(int page) {
        try { return objectMapper.writeValueAsString(Map.of("page", page)); }
        catch (JacksonException e) { throw new IllegalStateException("Chunk metadata serialization failed", e); }
    }
}
