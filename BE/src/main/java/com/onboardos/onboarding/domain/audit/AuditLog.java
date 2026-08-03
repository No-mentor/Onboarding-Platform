package com.onboardos.onboarding.domain.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Entity
@Table(name = "audit_logs")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditLog {

    @Id
    private UUID id;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(name = "resource_type", length = 50)
    private String resourceType;

    @Column(name = "resource_id")
    private UUID resourceId;

    @Column(nullable = false, length = 20)
    private String result;

    private String message;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> metadata = new HashMap<>();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public static AuditLog of(
            UUID workspaceId,
            UUID actorId,
            String eventType,
            String resourceType,
            UUID resourceId,
            String result,
            String message,
            Map<String, Object> metadata
    ) {
        AuditLog log = new AuditLog();
        log.id = UUID.randomUUID();
        log.workspaceId = workspaceId;
        log.actorId = actorId;
        log.eventType = eventType;
        log.resourceType = resourceType;
        log.resourceId = resourceId;
        log.result = result;
        log.message = message;
        log.metadata = metadata == null ? Map.of() : metadata;
        log.createdAt = Instant.now();
        return log;
    }
}
