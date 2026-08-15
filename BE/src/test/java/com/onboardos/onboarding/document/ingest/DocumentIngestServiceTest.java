package com.onboardos.onboarding.document.ingest;

import com.onboardos.onboarding.document.search.DocumentChunkVectorRepository;
import com.onboardos.onboarding.document.storage.DocumentStorage;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.inOrder;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import com.onboardos.onboarding.domain.document.DocumentChunk;

import com.onboardos.onboarding.ai.EmbeddingService;
import com.onboardos.onboarding.ai.embedding.EmbeddingConfigurationException;
import com.onboardos.onboarding.ai.embedding.EmbeddingProviderException;
import tools.jackson.databind.ObjectMapper;
import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import com.onboardos.onboarding.domain.document.DocumentStatus;
import com.onboardos.onboarding.domain.document.DocumentChunkRepository;
import com.onboardos.onboarding.domain.user.UserRole;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class DocumentIngestServiceTest {

    private final DocumentRepository documentRepository = mock(DocumentRepository.class);
    private final DocumentChunkRepository documentChunkRepository = mock(DocumentChunkRepository.class);
    private final DocumentChunkVectorRepository vectorRepository = mock(DocumentChunkVectorRepository.class);
    private final DocumentStorage storageService = mock(DocumentStorage.class);
    private final EmbeddingService embeddingService = mock(EmbeddingService.class);
    private final PdfTextExtractor pdfTextExtractor = mock(PdfTextExtractor.class);
    private final PageChunker pageChunker = new PageChunker();

    private final DocumentIngestService service = new DocumentIngestService(
            documentRepository, documentChunkRepository, vectorRepository, storageService, embeddingService,
            pdfTextExtractor, pageChunker, new ObjectMapper()
    );

    @Test void configurationErrorMarksFailedWithConfigurationPrefix() {
        DocumentEntity doc = newDocument();
        when(documentRepository.findById(doc.getId())).thenReturn(Optional.of(doc));
        stubPdf(doc);
        when(embeddingService.isEnabled()).thenReturn(true);
        when(embeddingService.embed(anyString()))
                .thenThrow(new EmbeddingConfigurationException("OpenAI 인증 실패(API 키를 확인하세요): HTTP 401", null));

        service.process(doc.getId());

        assertThat(doc.getStatus()).isEqualTo(DocumentStatus.FAILED);
        assertThat(doc.getErrorMessage()).contains("임베딩 설정 오류").doesNotContain("HTTP 401");
    }

    @Test void providerErrorMarksFailedWithRetryHintPrefix() {
        DocumentEntity doc = newDocument();
        when(documentRepository.findById(doc.getId())).thenReturn(Optional.of(doc));
        stubPdf(doc);
        when(embeddingService.isEnabled()).thenReturn(true);
        when(embeddingService.embed(anyString()))
                .thenThrow(new EmbeddingProviderException("OpenAI 임베딩 호출 실패: HTTP 503", null));

        service.process(doc.getId());

        assertThat(doc.getStatus()).isEqualTo(DocumentStatus.FAILED);
        assertThat(doc.getErrorMessage()).contains("임베딩 서비스 오류").doesNotContain("HTTP 503");
    }

    @Test void unknownErrorMarksFailedWithRawMessage() {
        DocumentEntity doc = newDocument();
        when(documentRepository.findById(doc.getId())).thenReturn(Optional.of(doc));
        stubPdf(doc);
        when(embeddingService.isEnabled()).thenReturn(true);
        when(embeddingService.embed(anyString())).thenThrow(new IllegalStateException("boom"));

        service.process(doc.getId());

        assertThat(doc.getStatus()).isEqualTo(DocumentStatus.FAILED);
        assertThat(doc.getErrorMessage()).doesNotContain("boom");
    }

    @Test void succeedsAndMarksReadyWhenEmbeddingDisabled() {
        DocumentEntity doc = newDocument();
        when(documentRepository.findById(doc.getId())).thenReturn(Optional.of(doc));
        stubPdf(doc);
        when(embeddingService.isEnabled()).thenReturn(false);

        service.process(doc.getId());

        assertThat(doc.getStatus()).isEqualTo(DocumentStatus.READY);
        assertThat(doc.getErrorMessage()).isNull();
    }

    @Test void enabledEmbeddingWithoutVectorMarksDocumentFailed() {
        DocumentEntity doc = newDocument();
        when(documentRepository.findById(doc.getId())).thenReturn(Optional.of(doc));
        stubPdf(doc);
        when(embeddingService.isEnabled()).thenReturn(true);
        when(embeddingService.embed(anyString())).thenReturn(null);

        service.process(doc.getId());

        assertThat(doc.getStatus()).isEqualTo(DocumentStatus.FAILED);
        assertThat(doc.getErrorMessage()).contains("임베딩 서비스 오류");
    }

    @Test void realPdfCreatesPageMetadataAndContinuousChunkIndexes() throws Exception {
        DocumentEntity doc = newDocument();
        when(documentRepository.findById(doc.getId())).thenReturn(Optional.of(doc));
        when(storageService.read(doc.getStorageKey())).thenReturn(PdfTestSupport.pdf("first page", "second page"));
        when(embeddingService.isEnabled()).thenReturn(false);
        DocumentIngestService realService = new DocumentIngestService(documentRepository, documentChunkRepository,
                vectorRepository, storageService, embeddingService, new PdfTextExtractor(), new PageChunker(), new ObjectMapper());

        realService.process(doc.getId());

        ArgumentCaptor<List<DocumentChunk>> captor = ArgumentCaptor.forClass(List.class);
        verify(documentChunkRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).extracting(DocumentChunk::getContent).containsExactly("first page", "second page");
        assertThat(captor.getValue()).extracting(DocumentChunk::getChunkIndex).containsExactly(0, 1);
        assertThat(captor.getValue()).extracting(DocumentChunk::getMetadata).containsExactly("{\"page\":1}", "{\"page\":2}");
        assertThat(doc.getStatus()).isEqualTo(DocumentStatus.READY);
        assertThat(doc.getChunkCount()).isEqualTo(2);
        InOrder writeOrder = inOrder(documentChunkRepository);
        writeOrder.verify(documentChunkRepository).deleteByDocumentId(doc.getId());
        writeOrder.verify(documentChunkRepository).flush();
        writeOrder.verify(documentChunkRepository).saveAll(captor.getValue());
    }

    @Test void corruptPdfMarksFailedWithoutLeakingParserDetails() {
        DocumentEntity doc = newDocument();
        when(documentRepository.findById(doc.getId())).thenReturn(Optional.of(doc));
        when(storageService.read(doc.getStorageKey())).thenReturn("private raw content".getBytes());
        DocumentIngestService realService = new DocumentIngestService(documentRepository, documentChunkRepository,
                vectorRepository, storageService, embeddingService, new PdfTextExtractor(), new PageChunker(), new ObjectMapper());
        realService.process(doc.getId());
        assertThat(doc.getStatus()).isEqualTo(DocumentStatus.FAILED);
        assertThat(doc.getErrorMessage()).doesNotContain("private raw content").doesNotContain("PDFBox");
    }

    private DocumentEntity newDocument() {
        return DocumentEntity.create(
                UUID.randomUUID(), "Test Doc", "storage/key.pdf", "key.pdf",
                "application/pdf", 100L, null, List.of(UserRole.MEMBER), UUID.randomUUID()
        );
    }

    private void stubPdf(DocumentEntity doc) {
        byte[] bytes = {1};
        when(storageService.read(doc.getStorageKey())).thenReturn(bytes);
        when(pdfTextExtractor.extract(bytes)).thenReturn(List.of(new PdfPageText(1, "hello world")));
    }
}
