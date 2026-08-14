package com.onboardos.onboarding.document.service;

import com.onboardos.onboarding.document.ingest.DocumentIngestService;
import com.onboardos.onboarding.document.storage.DocumentStorage;
import com.onboardos.onboarding.document.validation.DocumentUploadValidator;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import com.onboardos.onboarding.domain.document.DocumentVisibility;
import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.MembershipRepository;
import com.onboardos.onboarding.domain.user.MembershipStatus;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

class DocumentDeleteTest {
    private final DocumentRepository repository = mock(DocumentRepository.class);
    private final DocumentStorage storage = mock(DocumentStorage.class);
    private final DocumentIngestService ingest = mock(DocumentIngestService.class);
    private final MembershipRepository membershipRepository = mock(MembershipRepository.class);
    private final WorkspaceAccessService access = new WorkspaceAccessService(membershipRepository);
    private final DocumentService service = new DocumentService(repository, storage, ingest, access,
            new DocumentPermissionService(), new DocumentUploadValidator());
    private final UUID workspaceId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();
    private final UserPrincipal principal = new UserPrincipal(userId, "user@example.com", "hash", true);

    @BeforeEach void setUp() {
        when(repository.findByIdAndWorkspaceIdAndDeletedAtIsNull(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(Optional.empty());
    }

    @Test void ownerCanSoftDeleteDocumentWithoutTouchingStorage() {
        assertSuccessfulDelete(UserRole.OWNER);
    }

    @Test void adminCanSoftDeleteDocumentWithoutTouchingStorage() {
        assertSuccessfulDelete(UserRole.ADMIN);
    }

    @Test void managerCannotDeleteDocument() {
        assertForbidden(UserRole.MANAGER);
    }

    @Test void memberCannotDeleteDocument() {
        assertForbidden(UserRole.MEMBER);
    }

    @Test void inactiveMemberCannotDeleteDocument() {
        Membership membership = membership(UserRole.OWNER);
        membership.changeStatus(MembershipStatus.DISABLED);
        when(membershipRepository.findByWorkspaceIdAndUserIdAndDeletedAtIsNull(workspaceId, userId))
                .thenReturn(Optional.of(membership));

        assertError(() -> service.delete(principal, workspaceId, UUID.randomUUID()), ErrorCode.WORKSPACE_MISMATCH);
        verify(repository, never()).findByIdAndWorkspaceIdAndDeletedAtIsNull(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
        verifyNoInteractions(storage);
    }

    @Test void documentFromAnotherWorkspaceReturnsNotFound() {
        allow(UserRole.OWNER);
        UUID documentId = UUID.randomUUID();
        assertError(() -> service.delete(principal, workspaceId, documentId), ErrorCode.RESOURCE_NOT_FOUND);
        verify(repository).findByIdAndWorkspaceIdAndDeletedAtIsNull(documentId, workspaceId);
        verifyNoInteractions(storage);
    }

    @Test void missingDocumentReturnsNotFound() {
        allow(UserRole.ADMIN);
        assertError(() -> service.delete(principal, workspaceId, UUID.randomUUID()), ErrorCode.RESOURCE_NOT_FOUND);
        verifyNoInteractions(storage);
    }

    @Test void alreadyDeletedDocumentReturnsNotFound() {
        allow(UserRole.OWNER);
        DocumentEntity document = document();
        document.softDelete();
        when(repository.findByIdAndWorkspaceIdAndDeletedAtIsNull(document.getId(), workspaceId))
                .thenReturn(Optional.empty());
        assertError(() -> service.delete(principal, workspaceId, document.getId()), ErrorCode.RESOURCE_NOT_FOUND);
        verifyNoInteractions(storage);
    }

    @Test void deletedDocumentCannotBeReadOrReprocessed() {
        allow(UserRole.OWNER);
        DocumentEntity document = document();
        document.softDelete();
        when(repository.findByIdAndWorkspaceIdAndDeletedAtIsNull(document.getId(), workspaceId))
                .thenReturn(Optional.empty());

        assertError(() -> service.get(principal, workspaceId, document.getId()), ErrorCode.RESOURCE_NOT_FOUND);
        assertError(() -> service.reprocess(principal, workspaceId, document.getId()), ErrorCode.RESOURCE_NOT_FOUND);
        verifyNoInteractions(storage);
        verifyNoInteractions(ingest);
    }

    @Test void deletedDocumentIsExcludedFromItemsAndPageTotals() {
        allow(UserRole.OWNER);
        PageRequest pageable = PageRequest.of(0, 20);
        when(repository.findAccessible(workspaceId, UserRole.OWNER.name(), null, pageable))
                .thenReturn(new PageImpl<>(List.of(), pageable, 0));

        var result = service.list(principal, workspaceId, 0, 20, null);

        assertThat(result.items()).isEmpty();
        assertThat(result.totalElements()).isZero();
        assertThat(result.totalPages()).isZero();
        verifyNoInteractions(storage);
    }

    private void assertSuccessfulDelete(UserRole role) {
        allow(role);
        DocumentEntity document = document();
        when(repository.findByIdAndWorkspaceIdAndDeletedAtIsNull(document.getId(), workspaceId))
                .thenReturn(Optional.of(document));

        service.delete(principal, workspaceId, document.getId());

        assertThat(document.getDeletedAt()).isNotNull();
        verify(repository).findByIdAndWorkspaceIdAndDeletedAtIsNull(document.getId(), workspaceId);
        verify(repository, never()).delete(org.mockito.ArgumentMatchers.any());
        verifyNoInteractions(storage);
    }

    private void assertForbidden(UserRole role) {
        allow(role);
        assertError(() -> service.delete(principal, workspaceId, UUID.randomUUID()), ErrorCode.FORBIDDEN);
        verify(repository, never()).findByIdAndWorkspaceIdAndDeletedAtIsNull(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
        verifyNoInteractions(storage);
    }

    private void assertError(org.assertj.core.api.ThrowableAssert.ThrowingCallable call, ErrorCode errorCode) {
        assertThatThrownBy(call).isInstanceOfSatisfying(BusinessException.class,
                exception -> assertThat(exception.getErrorCode()).isEqualTo(errorCode));
    }

    private void allow(UserRole role) {
        when(membershipRepository.findByWorkspaceIdAndUserIdAndDeletedAtIsNull(workspaceId, userId))
                .thenReturn(Optional.of(membership(role)));
    }

    private Membership membership(UserRole role) {
        return Membership.create(workspaceId, userId, role, null, null, null);
    }

    private DocumentEntity document() {
        return DocumentEntity.create(workspaceId, "title", "key", "file.pdf", "application/pdf", 10L,
                DocumentVisibility.WORKSPACE, List.of(), userId);
    }
}
