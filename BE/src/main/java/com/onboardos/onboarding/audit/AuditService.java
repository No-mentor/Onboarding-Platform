package com.onboardos.onboarding.audit;

import com.onboardos.onboarding.domain.audit.AuditLog;
import com.onboardos.onboarding.domain.audit.AuditLogRepository;
import com.onboardos.onboarding.audit.dto.AuditLogPageResponse;
import com.onboardos.onboarding.audit.dto.AuditLogResponse;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
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

    /**
     * 호출부에서 이 기록 직후 예외를 던져 자신의 트랜잭션을 롤백할 예정일 때 사용한다.
     * 별도 트랜잭션으로 즉시 커밋해서, 바깥 트랜잭션이 롤백돼도 감사 로그는 남는다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordIndependently(
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
    public AuditLogPageResponse list(
            UUID workspaceId,
            UUID requesterId,
            int page,
            int size,
            UUID actorId,
            String eventType,
            Instant from,
            Instant to
    ) {
        validate(page, size, eventType, from, to);
        workspaceAccessService.requireRoles(workspaceId, requesterId, UserRole.OWNER, UserRole.ADMIN);
        String normalizedEventType = eventType == null || eventType.trim().isEmpty()
                ? null
                : eventType.trim();
        return AuditLogPageResponse.from(auditLogRepository.findFiltered(
                workspaceId, actorId, normalizedEventType, from, to, PageRequest.of(page, size)
        ).map(AuditLogResponse::from));
    }

    private void validate(int page, int size, String eventType, Instant from, Instant to) {
        if (page < 0) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "page는 0 이상이어야 합니다.");
        }
        if (size < 1 || size > 100) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "size는 1 이상 100 이하여야 합니다.");
        }
        if (eventType != null && eventType.trim().length() > 50) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "eventType은 50자를 초과할 수 없습니다.");
        }
        if (from != null && to != null && from.isAfter(to)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "from은 to보다 이후일 수 없습니다.");
        }
    }
}
