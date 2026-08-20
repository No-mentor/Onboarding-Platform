package com.onboardos.onboarding.document.service;

import com.onboardos.onboarding.document.ingest.DocumentIngestService;
import com.onboardos.onboarding.document.storage.DocumentStorage;
import com.onboardos.onboarding.document.validation.DocumentUploadValidator;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import com.onboardos.onboarding.domain.document.DocumentVisibility;
import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

class DocumentServiceAclTest {
    private final DocumentRepository repository = mock(DocumentRepository.class);
    private final WorkspaceAccessService access = mock(WorkspaceAccessService.class);
    private final DocumentService service = new DocumentService(repository, mock(DocumentStorage.class),
            mock(DocumentIngestService.class), access, new DocumentPermissionService(), new DocumentUploadValidator());
    private final UUID workspaceId = UUID.randomUUID();
    private final UserPrincipal principal = new UserPrincipal(UUID.randomUUID(), "user@example.com", "hash", true);

    @Test void activeMemberCanListAndGetWorkspaceDocument() {
        Membership member = membership(UserRole.MEMBER);
        DocumentEntity document = document(DocumentVisibility.WORKSPACE, List.of());
        prepare(member, document);
        assertThat(service.list(principal, workspaceId, 0, 20, null).items()).hasSize(1);
        assertThat(service.get(principal, workspaceId, document.getId()).id()).isEqualTo(document.getId());
    }

    @Test void allowedRoleCanAccessRestrictedDocument() {
        Membership manager = membership(UserRole.MANAGER);
        DocumentEntity document = document(DocumentVisibility.RESTRICTED, List.of(UserRole.MANAGER));
        prepare(manager, document);
        assertThat(service.list(principal, workspaceId, 0, 20, null).items()).hasSize(1);
        assertThat(service.get(principal, workspaceId, document.getId()).id()).isEqualTo(document.getId());
    }

    @Test void disallowedRestrictedDocumentIsExcludedFromList() {
        Membership member = membership(UserRole.MEMBER);
        DocumentEntity document = document(DocumentVisibility.RESTRICTED, List.of(UserRole.ADMIN));
        prepare(member, document);
        when(repository.findAccessible(workspaceId, "MEMBER", null, PageRequest.of(0, 20)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));
        assertThat(service.list(principal, workspaceId, 0, 20, null).items()).isEmpty();
    }

    @Test void disallowedRoleGetsDocumentAccessDeniedForDetail() {
        Membership member = membership(UserRole.MEMBER);
        DocumentEntity document = document(DocumentVisibility.RESTRICTED, List.of(UserRole.ADMIN));
        prepare(member, document);
        assertThatThrownBy(() -> service.get(principal, workspaceId, document.getId()))
                .isInstanceOfSatisfying(BusinessException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.DOCUMENT_ACCESS_DENIED));
    }

    @Test void emptyRestrictedRolesAreLimitedToOwnerAndAdmin() {
        DocumentEntity document = document(DocumentVisibility.RESTRICTED, List.of());
        assertThat(new DocumentPermissionService().canAccess(document, membership(UserRole.OWNER))).isTrue();
        assertThat(new DocumentPermissionService().canAccess(document, membership(UserRole.ADMIN))).isTrue();
        assertThat(new DocumentPermissionService().canAccess(document, membership(UserRole.MANAGER))).isFalse();
    }

    @Test void documentFromAnotherWorkspaceCannotBeAccessed() {
        Membership member = membership(UserRole.MEMBER);
        UUID documentId = UUID.randomUUID();
        when(access.requireMembership(workspaceId, principal.getId())).thenReturn(member);
        when(repository.findByIdAndWorkspaceIdAndDeletedAtIsNull(documentId, workspaceId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.get(principal, workspaceId, documentId))
                .isInstanceOfSatisfying(BusinessException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Test void softDeletedDocumentCannotBeAccessed() {
        Membership member = membership(UserRole.OWNER);
        DocumentEntity document = document(DocumentVisibility.WORKSPACE, List.of());
        document.softDelete();
        assertThat(new DocumentPermissionService().canAccess(document, member)).isFalse();
        when(access.requireMembership(workspaceId, principal.getId())).thenReturn(member);
        when(repository.findByIdAndWorkspaceIdAndDeletedAtIsNull(document.getId(), workspaceId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.get(principal, workspaceId, document.getId()))
                .isInstanceOfSatisfying(BusinessException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
    }

    private void prepare(Membership membership, DocumentEntity document) {
        when(access.requireMembership(workspaceId, principal.getId())).thenReturn(membership);
        when(repository.findAccessible(workspaceId, membership.getRole().name(), null, PageRequest.of(0, 20)))
                .thenReturn(new PageImpl<>(List.of(document), PageRequest.of(0, 20), 1));
        when(repository.findByIdAndWorkspaceIdAndDeletedAtIsNull(document.getId(), workspaceId)).thenReturn(Optional.of(document));
    }
    private Membership membership(UserRole role) { return Membership.create(workspaceId, principal.getId(), role, null, null, null); }
    private DocumentEntity document(DocumentVisibility visibility, List<UserRole> roles) {
        return DocumentEntity.create(workspaceId, "title", "key", "file.pdf", "application/pdf", 10L,
                visibility, roles, principal.getId());
    }
}
