package com.onboardos.onboarding.document.storage.cleanup;

import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentStorageCleanupService {
    private final DocumentRepository documentRepository;
    private final DocumentStoragePurgeWorker purgeWorker;
    private final Clock clock;

    @Value("${app.storage.cleanup.enabled:true}")
    private boolean enabled;

    @Value("${app.storage.cleanup.retention-days:7}")
    private int retentionDays;

    @Value("${app.storage.cleanup.batch-size:100}")
    private int batchSize;

    @Scheduled(cron = "${app.storage.cleanup.cron:0 0 3 * * *}", zone = "${app.storage.cleanup.zone:UTC}")
    public void scheduledCleanup() {
        if (enabled) {
            cleanupBatch();
        }
    }

    public int cleanupBatch() {
        Instant now = clock.instant();
        Instant cutoff = now.minus(retentionDays, ChronoUnit.DAYS);
        int safeBatchSize = Math.max(1, batchSize);
        List<UUID> documentIds = documentRepository
                .findByDeletedAtLessThanEqualAndStoragePurgedAtIsNullOrderByDeletedAtAsc(
                        cutoff, PageRequest.of(0, safeBatchSize))
                .map(DocumentEntity::getId)
                .getContent();

        int purged = 0;
        for (UUID documentId : documentIds) {
            try {
                purgeWorker.purge(documentId, cutoff, now);
                purged++;
            } catch (Exception exception) {
                log.warn("Document storage purge failed: {}", exception.getClass().getSimpleName());
            }
        }
        return purged;
    }
}
