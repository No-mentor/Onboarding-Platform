package com.onboardos.onboarding.document.storage.cleanup;

import com.onboardos.onboarding.document.storage.DocumentStorage;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import com.onboardos.onboarding.domain.document.DocumentVisibility;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

class DocumentStorageCleanupTest {
    private static final Instant NOW = Instant.parse("2026-08-11T03:00:00Z");
    private static final Instant CUTOFF = NOW.minusSeconds(7L * 24 * 60 * 60);

    private final DocumentRepository repository = mock(DocumentRepository.class);
    private final DocumentStorage storage = mock(DocumentStorage.class);
    private final DocumentStoragePurgeWorker worker = new DocumentStoragePurgeWorker(repository, storage);

    @Test void ignoresDocumentThatIsNotSoftDeleted() {
        DocumentEntity document = document("active");
        when(repository.findById(document.getId())).thenReturn(Optional.of(document));
        worker.purge(document.getId(), CUTOFF, NOW);
        verify(storage, never()).delete(any());
        assertThat(document.getStoragePurgedAt()).isNull();
    }

    @Test void ignoresDocumentDeletedLessThanSevenDaysAgo() {
        DocumentEntity document = deletedDocument("recent", CUTOFF.plusSeconds(1));
        when(repository.findById(document.getId())).thenReturn(Optional.of(document));
        worker.purge(document.getId(), CUTOFF, NOW);
        verify(storage, never()).delete(any());
        assertThat(document.getStoragePurgedAt()).isNull();
    }

    @Test void purgesDocumentDeletedExactlySevenDaysAgo() {
        assertPurged(deletedDocument("exact", CUTOFF));
    }

    @Test void purgesDocumentDeletedMoreThanSevenDaysAgo() {
        assertPurged(deletedDocument("older", CUTOFF.minusSeconds(1)));
    }

    @Test void ignoresAlreadyPurgedDocument() {
        DocumentEntity document = deletedDocument("purged", CUTOFF.minusSeconds(1));
        document.markStoragePurged(NOW.minusSeconds(10));
        when(repository.findById(document.getId())).thenReturn(Optional.of(document));
        worker.purge(document.getId(), CUTOFF, NOW);
        verify(storage, never()).delete(any());
    }

    @Test void storageFailureDoesNotMarkDocumentPurged() {
        DocumentEntity document = deletedDocument("failure", CUTOFF);
        when(repository.findById(document.getId())).thenReturn(Optional.of(document));
        doThrow(new RuntimeException("storage failure")).when(storage).delete(document.getStorageKey());
        assertThatThrownBy(() -> worker.purge(document.getId(), CUTOFF, NOW))
                .isInstanceOf(RuntimeException.class);
        assertThat(document.getStoragePurgedAt()).isNull();
        verify(repository, never()).save(document);
    }

    @Test void cleanupUsesFixedClockBoundedBatchAndContinuesAfterOneFailure() {
        DocumentStoragePurgeWorker purgeWorker = mock(DocumentStoragePurgeWorker.class);
        DocumentStorageCleanupService cleanup = new DocumentStorageCleanupService(
                repository, purgeWorker, Clock.fixed(NOW, ZoneOffset.UTC));
        ReflectionTestUtils.setField(cleanup, "enabled", true);
        ReflectionTestUtils.setField(cleanup, "retentionDays", 7);
        ReflectionTestUtils.setField(cleanup, "batchSize", 2);
        DocumentEntity first = deletedDocument("first", CUTOFF);
        DocumentEntity second = deletedDocument("second", CUTOFF.minusSeconds(1));
        PageRequest pageable = PageRequest.of(0, 2);
        when(repository.findByDeletedAtLessThanEqualAndStoragePurgedAtIsNullOrderByDeletedAtAsc(CUTOFF, pageable))
                .thenReturn(new PageImpl<>(List.of(first, second), pageable, 2));
        doThrow(new RuntimeException("first failure")).when(purgeWorker).purge(first.getId(), CUTOFF, NOW);

        int purged = cleanup.cleanupBatch();

        assertThat(purged).isEqualTo(1);
        verify(purgeWorker).purge(first.getId(), CUTOFF, NOW);
        verify(purgeWorker).purge(second.getId(), CUTOFF, NOW);
    }

    private void assertPurged(DocumentEntity document) {
        when(repository.findById(document.getId())).thenReturn(Optional.of(document));
        worker.purge(document.getId(), CUTOFF, NOW);
        verify(storage).delete(document.getStorageKey());
        assertThat(document.getStoragePurgedAt()).isEqualTo(NOW);
        verify(repository).save(document);
    }

    private DocumentEntity deletedDocument(String key, Instant deletedAt) {
        DocumentEntity document = document(key);
        ReflectionTestUtils.setField(document, "deletedAt", deletedAt);
        return document;
    }

    private DocumentEntity document(String key) {
        return DocumentEntity.create(UUID.randomUUID(), key, key, key + ".pdf", "application/pdf", 10L,
                DocumentVisibility.WORKSPACE, List.of(), null);
    }
}
