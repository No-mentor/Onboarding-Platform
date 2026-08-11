package com.onboardos.onboarding.document;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.onboardos.onboarding.document.dto.DocumentPageResponse;
import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import com.onboardos.onboarding.domain.document.DocumentStatus;
import com.onboardos.onboarding.domain.document.DocumentVisibility;
import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

class DocumentPaginationTest {
    private final DocumentRepository repository = mock(DocumentRepository.class);
    private final WorkspaceAccessService access = mock(WorkspaceAccessService.class);
    private final DocumentService service = new DocumentService(repository, mock(DocumentStorage.class),
            mock(DocumentIngestService.class), access, new DocumentPermissionService(), new DocumentUploadValidator());
    private final UUID workspaceId = UUID.randomUUID();
    private final UserPrincipal principal = new UserPrincipal(UUID.randomUUID(), "user@example.com", "hash", true);
    private final Membership member = Membership.create(workspaceId, principal.getId(), UserRole.MEMBER, null, null, null);

    @Test void returnsFirstPageMetadata() {
        PageRequest pageable = PageRequest.of(0, 2);
        when(access.requireMembership(workspaceId, principal.getId())).thenReturn(member);
        when(repository.findAccessible(workspaceId, "MEMBER", null, pageable))
                .thenReturn(new PageImpl<>(List.of(document("one"), document("two")), pageable, 5));
        DocumentPageResponse result = service.list(principal, workspaceId, 0, 2, null);
        assertThat(result.items()).hasSize(2);
        assertThat(result.page()).isZero();
        assertThat(result.size()).isEqualTo(2);
        assertThat(result.totalElements()).isEqualTo(5);
        assertThat(result.totalPages()).isEqualTo(3);
    }

    @Test void returnsNextAndLastPage() {
        PageRequest pageable = PageRequest.of(2, 2);
        when(access.requireMembership(workspaceId, principal.getId())).thenReturn(member);
        when(repository.findAccessible(workspaceId, "MEMBER", null, pageable))
                .thenReturn(new PageImpl<>(List.of(document("last")), pageable, 5));
        DocumentPageResponse result = service.list(principal, workspaceId, 2, 2, null);
        assertThat(result.page()).isEqualTo(2);
        assertThat(result.items()).hasSize(1);
        assertThat(result.totalPages()).isEqualTo(3);
    }

    @Test void returnsEmptyPageWithoutChangingTotals() {
        PageRequest pageable = PageRequest.of(3, 2);
        when(access.requireMembership(workspaceId, principal.getId())).thenReturn(member);
        when(repository.findAccessible(workspaceId, "MEMBER", null, pageable))
                .thenReturn(new PageImpl<>(List.of(), pageable, 5));
        DocumentPageResponse result = service.list(principal, workspaceId, 3, 2, null);
        assertThat(result.items()).isEmpty();
        assertThat(result.totalElements()).isEqualTo(5);
        assertThat(result.totalPages()).isEqualTo(3);
    }

    @Test void passesEveryStatusAndNoStatusToRepository() {
        when(access.requireMembership(workspaceId, principal.getId())).thenReturn(member);
        PageRequest pageable = PageRequest.of(0, 20);
        for (DocumentStatus status : DocumentStatus.values()) {
            when(repository.findAccessible(workspaceId, "MEMBER", status.name(), pageable))
                    .thenReturn(new PageImpl<>(List.of(), pageable, 0));
            service.list(principal, workspaceId, 0, 20, status);
            verify(repository).findAccessible(workspaceId, "MEMBER", status.name(), pageable);
        }
        when(repository.findAccessible(workspaceId, "MEMBER", null, pageable))
                .thenReturn(new PageImpl<>(List.of(), pageable, 0));
        service.list(principal, workspaceId, 0, 20, null);
        verify(repository).findAccessible(workspaceId, "MEMBER", null, pageable);
    }

    @Test void rejectsInvalidPageAndSize() {
        assertInvalid(() -> service.list(principal, workspaceId, -1, 20, null));
        assertInvalid(() -> service.list(principal, workspaceId, 0, 0, null));
        assertInvalid(() -> service.list(principal, workspaceId, 0, -1, null));
        assertInvalid(() -> service.list(principal, workspaceId, 0, 101, null));
    }

    @Test void parsesOnlyKnownStatuses() {
        assertThat(DocumentService.parseStatus(null)).isNull();
        assertThat(DocumentService.parseStatus("")).isNull();
        for (DocumentStatus status : DocumentStatus.values()) {
            assertThat(DocumentService.parseStatus(status.name())).isEqualTo(status);
        }
        assertInvalid(() -> DocumentService.parseStatus("UNKNOWN"));
    }

    private void assertInvalid(org.assertj.core.api.ThrowableAssert.ThrowingCallable call) {
        assertThatThrownBy(call).isInstanceOfSatisfying(BusinessException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
    }
    private DocumentEntity document(String title) {
        return DocumentEntity.create(workspaceId, title, title, title + ".pdf", "application/pdf", 10L,
                DocumentVisibility.WORKSPACE, List.of(), principal.getId());
    }
}
