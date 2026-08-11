package com.onboardos.onboarding.audit;

import com.onboardos.onboarding.audit.dto.AuditLogPageResponse;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.exception.ErrorResponse;
import com.onboardos.onboarding.global.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin Audit")
@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@RequiredArgsConstructor
public class AdminAuditController {
    private final AuditService auditService;

    @Operation(summary = "감사 로그 조회", description = "OWNER와 ADMIN이 Workspace 감사 로그를 필터링하여 조회합니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "조회 성공",
                    content = @Content(schema = @Schema(implementation = AuditLogPageResponse.class))),
            @ApiResponse(responseCode = "400", description = "VALIDATION_ERROR",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "UNAUTHORIZED",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "FORBIDDEN",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping
    public AuditLogPageResponse list(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @Parameter(description = "0부터 시작하는 페이지 번호", example = "0",
                    schema = @Schema(type = "integer", format = "int32", defaultValue = "0", minimum = "0"))
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "페이지 크기", example = "50",
                    schema = @Schema(type = "integer", format = "int32", defaultValue = "50",
                            minimum = "1", maximum = "100"))
            @RequestParam(defaultValue = "50") int size,
            @Parameter(description = "행위자 UUID", example = "123e4567-e89b-12d3-a456-426614174000")
            @RequestParam(required = false) String actorId,
            @Parameter(description = "감사 이벤트 유형", example = "DOC_ACCESS_DENIED")
            @RequestParam(required = false) String eventType,
            @Parameter(description = "조회 시작 시각(포함), ISO-8601", example = "2026-08-11T00:00:00Z")
            @RequestParam(required = false) String from,
            @Parameter(description = "조회 종료 시각(포함), ISO-8601", example = "2026-08-11T23:59:59Z")
            @RequestParam(required = false) String to
    ) {
        return auditService.list(
                workspaceId,
                SecurityUtils.currentUser().getId(),
                page,
                size,
                parseUuid(actorId),
                eventType,
                parseInstant(from),
                parseInstant(to)
        );
    }

    private UUID parseUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(value.trim());
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "actorId 형식이 올바르지 않습니다.");
        }
    }

    private Instant parseInstant(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(value.trim()).toInstant();
        } catch (DateTimeParseException exception) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "날짜와 시간은 ISO-8601 형식이어야 합니다.");
        }
    }
}
