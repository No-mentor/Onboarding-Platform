package com.onboardos.onboarding.document.storage.cleanup;

import com.onboardos.onboarding.document.storage.DocumentStorage;
import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DocumentStoragePurgeWorker {
    private final DocumentRepository documentRepository;
    private final DocumentStorage documentStorage;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void purge(UUID documentId, Instant cutoff, Instant purgedAt) {
        DocumentEntity document = documentRepository.findById(documentId).orElse(null);
        if (document == null || document.getDeletedAt() == null || document.getDeletedAt().isAfter(cutoff)
                || document.getStoragePurgedAt() != null) {
            return;
        }
        documentStorage.delete(document.getStorageKey());
        document.markStoragePurged(purgedAt);
        documentRepository.save(document);
    }
}
