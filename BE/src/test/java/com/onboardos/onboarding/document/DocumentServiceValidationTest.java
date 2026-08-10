package com.onboardos.onboarding.document;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import com.onboardos.onboarding.domain.document.DocumentVisibility;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

class DocumentServiceValidationTest {
    private final DocumentRepository repository = mock(DocumentRepository.class);
    private final DocumentStorage storage = mock(DocumentStorage.class);
    private final DocumentIngestService ingest = mock(DocumentIngestService.class);
    private final WorkspaceAccessService access = mock(WorkspaceAccessService.class);
    private final DocumentService service = new DocumentService(repository, storage, ingest, access,
            new DocumentPermissionService(), new DocumentUploadValidator());
    private final UUID workspaceId = UUID.randomUUID();
    private final UserPrincipal principal = new UserPrincipal(UUID.randomUUID(), "user@example.com", "hash", true);

    @BeforeEach void setUp() {
        when(storage.store(any(), any())).thenReturn("stored.pdf");
        when(repository.findById(any())).thenReturn(Optional.empty());
    }

    @Test void invalidFileDoesNotCallStorage() {
        MockMultipartFile invalid = new MockMultipartFile("file", "guide.pdf", MediaType.APPLICATION_PDF_VALUE, "invalid".getBytes());
        assertThatThrownBy(() -> service.upload(principal, workspaceId, invalid, null, DocumentVisibility.WORKSPACE, List.of()))
                .isInstanceOf(BusinessException.class);
        verify(storage, never()).store(any(), any());
    }

    @Test void validPdfIsStored() {
        MockMultipartFile valid = pdf();
        service.upload(principal, workspaceId, valid, null, DocumentVisibility.RESTRICTED, List.of(UserRole.MANAGER));
        verify(storage).store(workspaceId, valid);
    }

    @Test void workspaceVisibilityNormalizesAllowedRoles() {
        service.upload(principal, workspaceId, pdf(), null, DocumentVisibility.WORKSPACE, List.of(UserRole.MANAGER));
        verify(repository).save(org.mockito.ArgumentMatchers.argThat(document -> document.getAllowedRoles().isEmpty()));
    }

    @Test void invalidAllowedRoleIsValidationError() {
        assertThatThrownBy(() -> DocumentService.parseRoles(" MANAGER, NOT_A_ROLE "))
                .isInstanceOfSatisfying(BusinessException.class, ex -> {
                    assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                    assertThat(ex.getErrorCode().getStatus().value()).isEqualTo(400);
                });
    }

    @Test void parsesWhitespaceAndCommasSafely() {
        assertThat(DocumentService.parseRoles(" MANAGER, ,ADMIN ")).containsExactly(UserRole.MANAGER, UserRole.ADMIN);
    }

    private MockMultipartFile pdf() {
        return new MockMultipartFile("file", "guide.pdf", MediaType.APPLICATION_PDF_VALUE,
                "%PDF-content".getBytes(StandardCharsets.US_ASCII));
    }
}
