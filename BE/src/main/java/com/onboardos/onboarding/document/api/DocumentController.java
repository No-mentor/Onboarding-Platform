package com.onboardos.onboarding.document.api;

import com.onboardos.onboarding.document.service.DocumentService;
import com.onboardos.onboarding.document.api.dto.DocumentPageResponse;
import com.onboardos.onboarding.document.api.dto.DocumentResponse;
import com.onboardos.onboarding.domain.document.DocumentVisibility;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.exception.ErrorResponse;
import com.onboardos.onboarding.global.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
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

    @Operation(summary = "문서 업로드")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "업로드 성공"),
            @ApiResponse(responseCode = "400", description = "파일 또는 요청값 검증 실패", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Workspace 업로드 권한 없음", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse upload(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "visibility", required = false, defaultValue = "WORKSPACE") DocumentVisibility visibility,
            @RequestParam(value = "allowedRoles", required = false) String allowedRoles
    ) {
        List<UserRole> roles = DocumentService.parseRoles(allowedRoles);
        return documentService.upload(SecurityUtils.currentUser(), workspaceId, file, title, visibility, roles);
    }

    @Operation(summary = "문서 목록")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "400", description = "페이지 또는 상태값 검증 실패", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Workspace 접근 권한 없음", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping
    public DocumentPageResponse list(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @Parameter(description = "페이지 번호", schema = @Schema(defaultValue = "0", minimum = "0"))
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "페이지 크기", schema = @Schema(defaultValue = "20", minimum = "1", maximum = "100"))
            @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "문서 처리 상태", schema = @Schema(allowableValues = {"PENDING", "PROCESSING", "READY", "FAILED"}))
            @RequestParam(required = false) String status
    ) {
        return documentService.list(SecurityUtils.currentUser(), workspaceId, page, size,
                DocumentService.parseStatus(status));
    }

    @Operation(summary = "문서 상세")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Workspace 권한 없음 또는 DOCUMENT_ACCESS_DENIED", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "RESOURCE_NOT_FOUND", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/{documentId}")
    public DocumentResponse get(@RequestHeader("X-Workspace-Id") UUID workspaceId, @PathVariable UUID documentId) {
        return documentService.get(SecurityUtils.currentUser(), workspaceId, documentId);
    }

    @Operation(summary = "문서 재처리")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "재처리 요청 성공"),
            @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Workspace 재처리 권한 없음", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "RESOURCE_NOT_FOUND", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PostMapping("/{documentId}/reprocess")
    public DocumentResponse reprocess(@RequestHeader("X-Workspace-Id") UUID workspaceId, @PathVariable UUID documentId) {
        return documentService.reprocess(SecurityUtils.currentUser(), workspaceId, documentId);
    }

    @Operation(summary = "문서 soft delete")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "삭제 성공", content = @Content),
            @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Workspace 삭제 권한 없음", content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "RESOURCE_NOT_FOUND", content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @DeleteMapping("/{documentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestHeader("X-Workspace-Id") UUID workspaceId, @PathVariable UUID documentId) {
        documentService.delete(SecurityUtils.currentUser(), workspaceId, documentId);
    }
}
