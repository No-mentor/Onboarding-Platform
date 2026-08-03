package com.onboardos.onboarding.document;

import com.onboardos.onboarding.document.dto.DocumentResponse;
import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import com.onboardos.onboarding.domain.document.DocumentVisibility;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentStorageService storageService;
    private final DocumentIngestService ingestService;
    private final WorkspaceAccessService workspaceAccessService;

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
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "파일이 비어 있습니다.");
        }

        String storageKey = storageService.store(workspaceId, file);
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
                visibility,
                allowedRoles,
                principal.getId()
        );
        documentRepository.save(entity);
        // 동기 처리로 데모 안정성 확보 (대용량 시 processAsync로 전환)
        ingestService.process(entity.getId());
        DocumentEntity refreshed = documentRepository.findById(entity.getId()).orElse(entity);
        return DocumentResponse.from(refreshed);
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> list(UserPrincipal principal, UUID workspaceId) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());
        return documentRepository.findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc(workspaceId).stream()
                .map(DocumentResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public DocumentResponse get(UserPrincipal principal, UUID workspaceId, UUID documentId) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());
        DocumentEntity doc = documentRepository.findByIdAndWorkspaceIdAndDeletedAtIsNull(documentId, workspaceId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "문서를 찾을 수 없습니다."));
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
                .map(UserRole::valueOf)
                .toList();
    }
}
