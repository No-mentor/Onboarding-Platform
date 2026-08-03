package com.onboardos.onboarding.audit;

import com.onboardos.onboarding.domain.audit.AuditLog;
import com.onboardos.onboarding.domain.audit.AuditLogRepository;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final WorkspaceAccessService workspaceAccessService;

    @Transactional
    public void record(
            UUID workspaceId,
            UUID actorId,
            String eventType,
            String resourceType,
            UUID resourceId,
            String result,
            String message,
            Map<String, Object> metadata
    ) {
        auditLogRepository.save(AuditLog.of(
                workspaceId, actorId, eventType, resourceType, resourceId, result, message, metadata
        ));
    }

    @Transactional(readOnly = true)
    public List<AuditLog> list(UUID workspaceId, UUID actorId, int page, int size) {
        workspaceAccessService.requireRoles(workspaceId, actorId, UserRole.OWNER, UserRole.ADMIN);
        return auditLogRepository.findByWorkspaceIdOrderByCreatedAtDesc(
                workspaceId,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100))
        );
    }
}
