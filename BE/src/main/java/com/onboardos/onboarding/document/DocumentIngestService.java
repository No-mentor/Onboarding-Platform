package com.onboardos.onboarding.document;

import com.onboardos.onboarding.ai.EmbeddingService;
import com.onboardos.onboarding.ai.embedding.EmbeddingConfigurationException;
import com.onboardos.onboarding.ai.embedding.EmbeddingProviderException;
import com.onboardos.onboarding.domain.document.DocumentChunk;
import com.onboardos.onboarding.domain.document.DocumentChunkRepository;
import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentIngestService {

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentChunkVectorRepository vectorRepository;
    private final DocumentStorage storageService;
    private final EmbeddingService embeddingService;

    @Async
    @Transactional
    public void processAsync(UUID documentId) {
        process(documentId);
    }

    @Transactional
    public void process(UUID documentId) {
        DocumentEntity doc = documentRepository.findById(documentId).orElse(null);
        if (doc == null || doc.isDeleted()) {
            return;
        }
        Integer failedChunkIndex = null;
        try {
            doc.markProcessing();
            documentRepository.save(doc);

            documentChunkRepository.deleteByDocumentId(documentId);
            String text = storageService.readText(doc.getStorageKey());
            List<String> parts = chunk(text, 800);
            List<DocumentChunk> chunks = new ArrayList<>();
            for (int i = 0; i < parts.size(); i++) {
                chunks.add(DocumentChunk.create(documentId, doc.getWorkspaceId(), i, parts.get(i)));
            }
            if (chunks.isEmpty()) {
                chunks.add(DocumentChunk.create(
                        documentId,
                        doc.getWorkspaceId(),
                        0,
                        "문서 내용이 비어 있거나 추출할 텍스트가 없습니다. 제목: " + doc.getTitle()
                ));
            }
            documentChunkRepository.saveAll(chunks);

            if (embeddingService.isEnabled()) {
                for (DocumentChunk c : chunks) {
                    failedChunkIndex = c.getChunkIndex();
                    float[] vec = embeddingService.embed(c.getContent());
                    String literal = embeddingService.toPgVectorLiteral(vec);
                    if (literal != null) {
                        vectorRepository.updateEmbedding(c.getId(), literal);
                    }
                }
                failedChunkIndex = null;
                log.info("Embeddings stored for document {}", documentId);
            }

            doc.markReady(chunks.size());
            documentRepository.save(doc);
            log.info("Document ingested: {} chunks={}", documentId, chunks.size());
        } catch (EmbeddingConfigurationException e) {
            logIngestFailure(documentId, e, failedChunkIndex);
            doc.markFailed("설정 오류: " + e.getMessage());
            documentRepository.save(doc);
        } catch (EmbeddingProviderException e) {
            logIngestFailure(documentId, e, failedChunkIndex);
            doc.markFailed("일시적 오류, 재시도 권장: " + e.getMessage());
            documentRepository.save(doc);
        } catch (Exception e) {
            logIngestFailure(documentId, e, failedChunkIndex);
            doc.markFailed(e.getMessage() == null ? "ingest failed" : e.getMessage());
            documentRepository.save(doc);
        }
    }

    private void logIngestFailure(UUID documentId, Exception e, Integer failedChunkIndex) {
        log.error(
                "Document ingest failed: documentId={}, type={}, failedChunkIndex={}",
                documentId, e.getClass().getSimpleName(), failedChunkIndex, e
        );
    }

    private List<String> chunk(String text, int size) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        String normalized = text.replace("\r\n", "\n").trim();
        List<String> result = new ArrayList<>();
        int i = 0;
        while (i < normalized.length()) {
            int end = Math.min(i + size, normalized.length());
            result.add(normalized.substring(i, end));
            i = end;
        }
        return result;
    }
}
