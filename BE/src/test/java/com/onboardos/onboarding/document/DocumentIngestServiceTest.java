package com.onboardos.onboarding.document;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.onboardos.onboarding.ai.EmbeddingService;
import com.onboardos.onboarding.ai.embedding.EmbeddingConfigurationException;
import com.onboardos.onboarding.ai.embedding.EmbeddingProviderException;
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

    private final DocumentIngestService service = new DocumentIngestService(
            documentRepository, documentChunkRepository, vectorRepository, storageService, embeddingService
    );

    @Test void configurationErrorMarksFailedWithConfigurationPrefix() {
        DocumentEntity doc = newDocument();
        when(documentRepository.findById(doc.getId())).thenReturn(Optional.of(doc));
        when(storageService.readText(doc.getStorageKey())).thenReturn("hello world");
        when(embeddingService.isEnabled()).thenReturn(true);
        when(embeddingService.embed(anyString()))
                .thenThrow(new EmbeddingConfigurationException("OpenAI 인증 실패(API 키를 확인하세요): HTTP 401", null));

        service.process(doc.getId());

        assertThat(doc.getStatus()).isEqualTo(DocumentStatus.FAILED);
        assertThat(doc.getErrorMessage()).startsWith("설정 오류: ");
        assertThat(doc.getErrorMessage()).contains("HTTP 401");
    }

    @Test void providerErrorMarksFailedWithRetryHintPrefix() {
        DocumentEntity doc = newDocument();
        when(documentRepository.findById(doc.getId())).thenReturn(Optional.of(doc));
        when(storageService.readText(doc.getStorageKey())).thenReturn("hello world");
        when(embeddingService.isEnabled()).thenReturn(true);
        when(embeddingService.embed(anyString()))
                .thenThrow(new EmbeddingProviderException("OpenAI 임베딩 호출 실패: HTTP 503", null));

        service.process(doc.getId());

        assertThat(doc.getStatus()).isEqualTo(DocumentStatus.FAILED);
        assertThat(doc.getErrorMessage()).startsWith("일시적 오류, 재시도 권장: ");
        assertThat(doc.getErrorMessage()).contains("HTTP 503");
    }

    @Test void unknownErrorMarksFailedWithRawMessage() {
        DocumentEntity doc = newDocument();
        when(documentRepository.findById(doc.getId())).thenReturn(Optional.of(doc));
        when(storageService.readText(doc.getStorageKey())).thenReturn("hello world");
        when(embeddingService.isEnabled()).thenReturn(true);
        when(embeddingService.embed(anyString())).thenThrow(new IllegalStateException("boom"));

        service.process(doc.getId());

        assertThat(doc.getStatus()).isEqualTo(DocumentStatus.FAILED);
        assertThat(doc.getErrorMessage()).isEqualTo("boom");
        assertThat(doc.getErrorMessage()).doesNotStartWith("설정 오류");
        assertThat(doc.getErrorMessage()).doesNotStartWith("일시적 오류");
    }

    @Test void succeedsAndMarksReadyWhenEmbeddingDisabled() {
        DocumentEntity doc = newDocument();
        when(documentRepository.findById(doc.getId())).thenReturn(Optional.of(doc));
        when(storageService.readText(doc.getStorageKey())).thenReturn("hello world");
        when(embeddingService.isEnabled()).thenReturn(false);

        service.process(doc.getId());

        assertThat(doc.getStatus()).isEqualTo(DocumentStatus.READY);
        assertThat(doc.getErrorMessage()).isNull();
    }

    private DocumentEntity newDocument() {
        return DocumentEntity.create(
                UUID.randomUUID(), "Test Doc", "storage/key.pdf", "key.pdf",
                "application/pdf", 100L, null, List.of(UserRole.MEMBER), UUID.randomUUID()
        );
    }
}
