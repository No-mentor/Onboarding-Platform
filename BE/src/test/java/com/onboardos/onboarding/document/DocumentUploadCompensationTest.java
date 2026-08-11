package com.onboardos.onboarding.document;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.onboardos.onboarding.domain.document.DocumentRepository;
import com.onboardos.onboarding.domain.document.DocumentVisibility;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

class DocumentUploadCompensationTest {
    private final DocumentRepository repository = mock(DocumentRepository.class);
    private final DocumentStorage storage = mock(DocumentStorage.class);
    private final WorkspaceAccessService access = mock(WorkspaceAccessService.class);
    private final DocumentService service = new DocumentService(repository, storage, mock(DocumentIngestService.class),
            access, new DocumentPermissionService(), new DocumentUploadValidator());
    private final UUID workspaceId = UUID.randomUUID();
    private final UserPrincipal principal = new UserPrincipal(UUID.randomUUID(), "user@example.com", "hash", true);

    @BeforeEach void setUp() {
        TransactionSynchronizationManager.initSynchronization();
        when(storage.store(any(), any())).thenReturn("workspace/document.pdf");
    }

    @AfterEach void tearDown() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test void rollbackAfterDatabaseFailureDeletesUploadedObject() {
        RuntimeException databaseFailure = new RuntimeException("database failure");
        when(repository.save(any())).thenThrow(databaseFailure);
        assertThatThrownBy(this::upload).isSameAs(databaseFailure);
        complete(TransactionSynchronization.STATUS_ROLLED_BACK);
        verify(storage).delete("workspace/document.pdf");
    }

    @Test void commitDoesNotDeleteUploadedObject() {
        upload();
        complete(TransactionSynchronization.STATUS_COMMITTED);
        verify(storage, never()).delete(any());
    }

    @Test void cleanupFailureDoesNotReplaceOriginalDatabaseFailure() {
        RuntimeException databaseFailure = new RuntimeException("database failure");
        when(repository.save(any())).thenThrow(databaseFailure);
        doThrow(new RuntimeException("cleanup failure")).when(storage).delete("workspace/document.pdf");
        assertThatThrownBy(this::upload).isSameAs(databaseFailure);
        complete(TransactionSynchronization.STATUS_ROLLED_BACK);
    }

    private void upload() {
        service.upload(principal, workspaceId,
                new MockMultipartFile("file", "file.pdf", MediaType.APPLICATION_PDF_VALUE, "%PDF-content".getBytes()),
                null, DocumentVisibility.WORKSPACE, List.of());
    }

    private void complete(int status) {
        List<TransactionSynchronization> synchronizations =
                TransactionSynchronizationManager.getSynchronizations();
        synchronizations.forEach(synchronization -> synchronization.afterCompletion(status));
    }
}
