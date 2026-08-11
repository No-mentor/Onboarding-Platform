package com.onboardos.onboarding.document;

import com.onboardos.onboarding.document.dto.DocumentResponse;
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
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentStorage storageService;
    private final DocumentIngestService ingestService;
    private final WorkspaceAccessService workspaceAccessService;
    private final DocumentPermissionService permissionService;
    private final DocumentUploadValidator uploadValidator;

    @Transactional
    public DocumentResponse upload(
            UserPrincipal principal,
            UUID workspaceId,
            MultipartFile file,
            String title,
            DocumentVisibility visibility,
            List<UserRole> allowedRoles
    ) {
        workspaceAccessService.requireRoles(
                workspaceId,
                principal.getId(),
                UserRole.OWNER,
                UserRole.ADMIN,
                UserRole.MANAGER
        );
        uploadValidator.validate(file);

        DocumentVisibility normalizedVisibility = visibility == null
                ? DocumentVisibility.WORKSPACE
                : visibility;
        List<UserRole> normalizedAllowedRoles = normalizedVisibility == DocumentVisibility.WORKSPACE
                ? List.of()
                : allowedRoles == null ? List.of() : allowedRoles;

        String storageKey = storageService.store(workspaceId, file);
        registerRollbackCleanup(storageKey);
        String docTitle = (title == null || title.isBlank())
                ? file.getOriginalFilename()
                : title;

        DocumentEntity entity = DocumentEntity.create(
                workspaceId,
                docTitle,
                storageKey,
                file.getOriginalFilename(),
                file.getContentType(),
                file.getSize(),
                normalizedVisibility,
                normalizedAllowedRoles,
                principal.getId()
        );
        documentRepository.save(entity);
        // 동기 처리로 데모 안정성 확보 (대용량 시 processAsync로 전환)
        ingestService.process(entity.getId());
        DocumentEntity refreshed = documentRepository.findById(entity.getId()).orElse(entity);
        return DocumentResponse.from(refreshed);
    }

    @Transactional(readOnly = true)
    public DocumentPageResponse list(
            UserPrincipal principal,
            UUID workspaceId,
            int page,
            int size,
            DocumentStatus status
    ) {
        validatePageRequest(page, size);
        Membership membership = workspaceAccessService.requireMembership(workspaceId, principal.getId());
        Page<DocumentResponse> result = documentRepository.findAccessible(
                        workspaceId,
                        membership.getRole().name(),
                        status == null ? null : status.name(),
                        PageRequest.of(page, size)
                )
                .map(DocumentResponse::from);
        return DocumentPageResponse.from(result);
    }

    @Transactional(readOnly = true)
    public DocumentResponse get(UserPrincipal principal, UUID workspaceId, UUID documentId) {
        Membership membership = workspaceAccessService.requireMembership(workspaceId, principal.getId());
        DocumentEntity doc = documentRepository.findByIdAndWorkspaceIdAndDeletedAtIsNull(documentId, workspaceId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "문서를 찾을 수 없습니다."));
        if (!permissionService.canAccess(doc, membership)) {
            throw new BusinessException(ErrorCode.DOCUMENT_ACCESS_DENIED);
        }
        return DocumentResponse.from(doc);
    }

    @Transactional
    public DocumentResponse reprocess(UserPrincipal principal, UUID workspaceId, UUID documentId) {
        workspaceAccessService.requireRoles(
                workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER
        );
        DocumentEntity doc = documentRepository.findByIdAndWorkspaceIdAndDeletedAtIsNull(documentId, workspaceId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "문서를 찾을 수 없습니다."));
        doc.resetForReprocess();
        documentRepository.save(doc);
        ingestService.process(doc.getId());
        return DocumentResponse.from(documentRepository.findById(doc.getId()).orElse(doc));
    }

    @Transactional
    public void delete(UserPrincipal principal, UUID workspaceId, UUID documentId) {
        workspaceAccessService.requireRoles(workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN);
        DocumentEntity doc = documentRepository.findByIdAndWorkspaceIdAndDeletedAtIsNull(documentId, workspaceId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "문서를 찾을 수 없습니다."));
        doc.softDelete();
    }

    public static List<UserRole> parseRoles(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(DocumentService::parseRole)
                .toList();
    }

    private static UserRole parseRole(String value) {
        try {
            return UserRole.valueOf(value);
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "allowedRoles에 올바르지 않은 역할이 포함되어 있습니다.");
        }
    }

    public static DocumentStatus parseStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return DocumentStatus.valueOf(value);
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "status 값이 올바르지 않습니다.");
        }
    }

    private void validatePageRequest(int page, int size) {
        if (page < 0) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "page는 0 이상이어야 합니다.");
        }
        if (size < 1 || size > 100) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "size는 1 이상 100 이하여야 합니다.");
        }
    }

    private void registerRollbackCleanup(String storageKey) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_ROLLED_BACK) {
                    return;
                }
                try {
                    storageService.delete(storageKey);
                } catch (Exception exception) {
                    log.warn("Document upload rollback cleanup failed: {}",
                            exception.getClass().getSimpleName());
                }
            }
        });
    }
}
