package com.onboardos.onboarding.domain.audit;

import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    @Query(value = """
            SELECT log.* FROM audit_logs log
            WHERE log.workspace_id = :workspaceId
              AND (CAST(:actorId AS uuid) IS NULL OR log.actor_id = CAST(:actorId AS uuid))
              AND (CAST(:eventType AS varchar) IS NULL OR log.event_type = CAST(:eventType AS varchar))
              AND (CAST(:from AS timestamptz) IS NULL OR log.created_at >= CAST(:from AS timestamptz))
              AND (CAST(:to AS timestamptz) IS NULL OR log.created_at <= CAST(:to AS timestamptz))
            ORDER BY log.created_at DESC, log.id DESC
            """, countQuery = """
            SELECT count(*) FROM audit_logs log
            WHERE log.workspace_id = :workspaceId
              AND (CAST(:actorId AS uuid) IS NULL OR log.actor_id = CAST(:actorId AS uuid))
              AND (CAST(:eventType AS varchar) IS NULL OR log.event_type = CAST(:eventType AS varchar))
              AND (CAST(:from AS timestamptz) IS NULL OR log.created_at >= CAST(:from AS timestamptz))
              AND (CAST(:to AS timestamptz) IS NULL OR log.created_at <= CAST(:to AS timestamptz))
            """, nativeQuery = true)
    Page<AuditLog> findFiltered(
            @Param("workspaceId") UUID workspaceId,
            @Param("actorId") UUID actorId,
            @Param("eventType") String eventType,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable
    );
}
