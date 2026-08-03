package com.onboardos.onboarding.audit;

import com.onboardos.onboarding.domain.audit.AuditLog;
import com.onboardos.onboarding.global.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Map;
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

    @Operation(summary = "감사 로그 조회 (OWNER/ADMIN)")
    @GetMapping
    public Map<String, List<AuditLog>> list(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return Map.of(
                "items",
                auditService.list(workspaceId, SecurityUtils.currentUser().getId(), page, size)
        );
    }
}
