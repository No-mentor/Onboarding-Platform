package com.onboardos.onboarding.audit.dto;

import com.onboardos.onboarding.domain.audit.AuditLog;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record AuditLogResponse(
        UUID id,
        String eventType,
        UUID actorId,
        String resourceType,
        UUID resourceId,
        String result,
        Map<String, Object> metadata,
        Instant createdAt
) {
    public static AuditLogResponse from(AuditLog log) {
        return new AuditLogResponse(
                log.getId(), log.getEventType(), log.getActorId(), log.getResourceType(),
                log.getResourceId(), log.getResult(), log.getMetadata(), log.getCreatedAt()
        );
    }
}
