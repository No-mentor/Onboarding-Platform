package com.onboardos.onboarding.document;

import com.onboardos.onboarding.document.dto.DocumentResponse;
import com.onboardos.onboarding.domain.document.DocumentVisibility;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Documents")
@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @Operation(summary = "문서 업로드 (파싱→청킹→READY)")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse upload(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "visibility", required = false, defaultValue = "WORKSPACE")
            DocumentVisibility visibility,
            @RequestParam(value = "allowedRoles", required = false) String allowedRoles
    ) {
        List<UserRole> roles = DocumentService.parseRoles(allowedRoles);
        return documentService.upload(
                SecurityUtils.currentUser(),
                workspaceId,
                file,
                title,
                visibility,
                roles
        );
    }

    @Operation(summary = "문서 목록")
    @GetMapping
    public Map<String, List<DocumentResponse>> list(@RequestHeader("X-Workspace-Id") UUID workspaceId) {
        return Map.of("items", documentService.list(SecurityUtils.currentUser(), workspaceId));
    }

    @Operation(summary = "문서 상세")
    @GetMapping("/{documentId}")
    public DocumentResponse get(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @PathVariable UUID documentId
    ) {
        return documentService.get(SecurityUtils.currentUser(), workspaceId, documentId);
    }

    @Operation(summary = "문서 재처리")
    @PostMapping("/{documentId}/reprocess")
    public DocumentResponse reprocess(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @PathVariable UUID documentId
    ) {
        return documentService.reprocess(SecurityUtils.currentUser(), workspaceId, documentId);
    }

    @Operation(summary = "문서 soft delete")
    @DeleteMapping("/{documentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @PathVariable UUID documentId
    ) {
        documentService.delete(SecurityUtils.currentUser(), workspaceId, documentId);
    }
}
