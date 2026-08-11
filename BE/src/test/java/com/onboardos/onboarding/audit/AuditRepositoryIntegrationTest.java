package com.onboardos.onboarding.audit;

import static org.assertj.core.api.Assertions.assertThat;

import com.onboardos.onboarding.domain.audit.AuditLog;
import com.onboardos.onboarding.domain.audit.AuditLogRepository;
import com.onboardos.onboarding.support.PostgresTestcontainersConfig;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@Tag("integration")
@SpringBootTest
@Import(PostgresTestcontainersConfig.class)
@ActiveProfiles("test")
class AuditRepositoryIntegrationTest {
    @Autowired AuditLogRepository repository;
    @Autowired JdbcTemplate jdbc;

    private UUID workspaceId;
    private UUID otherWorkspaceId;
    private UUID actorA;
    private UUID actorB;
    private UUID otherActor;
    private UUID lowerId;
    private UUID higherId;
    private final Instant boundary = Instant.parse("2026-08-11T10:00:00Z");
    private final Instant sameTime = Instant.parse("2026-08-11T12:00:00Z");

    @BeforeEach void setUp() {
        workspaceId = UUID.randomUUID();
        otherWorkspaceId = UUID.randomUUID();
        actorA = UUID.randomUUID();
        actorB = UUID.randomUUID();
        otherActor = UUID.randomUUID();
        UUID firstId = UUID.randomUUID();
        UUID secondId = UUID.randomUUID();
        lowerId = firstId.compareTo(secondId) < 0 ? firstId : secondId;
        higherId = firstId.compareTo(secondId) < 0 ? secondId : firstId;
        insertWorkspace(workspaceId, "audit-" + workspaceId);
        insertWorkspace(otherWorkspaceId, "audit-other-" + otherWorkspaceId);
        insertUser(actorA, "actor-a-" + actorA + "@example.com");
        insertUser(actorB, "actor-b-" + actorB + "@example.com");
        insertUser(otherActor, "other-" + otherActor + "@example.com");
        insertLog(lowerId, workspaceId, actorA, "DOC_ACCESS_DENIED", sameTime);
        insertLog(higherId, workspaceId, actorA, "DOC_ACCESS_DENIED", sameTime);
        insertLog(UUID.randomUUID(), workspaceId, actorA, "CHAT_QUERY", boundary);
        insertLog(UUID.randomUUID(), workspaceId, actorB, "DOC_ACCESS_DENIED", boundary.minusSeconds(3600));
        insertLog(UUID.randomUUID(), otherWorkspaceId, otherActor, "CHAT_QUERY", sameTime.plusSeconds(3600));
    }

    @Test void filtersIndividuallyAndInCombinationWithInclusiveTimeBounds() {
        assertThat(query(actorA, null, null, null).getTotalElements()).isEqualTo(3);
        assertThat(query(null, "CHAT_QUERY", null, null).getTotalElements()).isEqualTo(1);
        assertThat(query(null, null, boundary, null).getTotalElements()).isEqualTo(3);
        assertThat(query(null, null, null, boundary).getTotalElements()).isEqualTo(2);
        assertThat(query(null, null, boundary, sameTime).getTotalElements()).isEqualTo(3);
        assertThat(query(actorA, "DOC_ACCESS_DENIED", boundary, sameTime).getTotalElements()).isEqualTo(2);
        assertThat(query(otherActor, null, null, null).getTotalElements()).isZero();
    }

    @Test void unfilteredQueryIsWorkspaceIsolatedAndCounted() {
        Page<AuditLog> result = query(null, null, null, null);
        assertThat(result.getTotalElements()).isEqualTo(4);
        assertThat(result.getTotalPages()).isEqualTo(1);
        assertThat(result.getContent()).allMatch(log -> log.getWorkspaceId().equals(workspaceId));
    }

    @Test void equalCreatedAtUsesIdDescendingAcrossSizeOnePagesWithoutDuplicates() {
        Page<AuditLog> first = repository.findFiltered(
                workspaceId, null, null, null, null, PageRequest.of(0, 1));
        Page<AuditLog> second = repository.findFiltered(
                workspaceId, null, null, null, null, PageRequest.of(1, 1));
        assertThat(first.getContent()).extracting(AuditLog::getId).containsExactly(higherId);
        assertThat(second.getContent()).extracting(AuditLog::getId).containsExactly(lowerId);
        assertThat(first.getTotalElements()).isEqualTo(4);
        assertThat(first.getTotalPages()).isEqualTo(4);
    }

    private Page<AuditLog> query(UUID actorId, String eventType, Instant from, Instant to) {
        return repository.findFiltered(workspaceId, actorId, eventType, from, to, PageRequest.of(0, 50));
    }

    private void insertWorkspace(UUID id, String slug) {
        jdbc.update("INSERT INTO workspaces (id, name, slug) VALUES (?, ?, ?)", id, slug, slug);
    }

    private void insertUser(UUID id, String email) {
        jdbc.update("INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, 'Actor', 'hash')", id, email);
    }

    private void insertLog(UUID id, UUID ws, UUID actor, String eventType, Instant createdAt) {
        jdbc.update("""
                INSERT INTO audit_logs
                    (id, workspace_id, actor_id, event_type, resource_type, resource_id,
                     result, message, metadata, created_at)
                VALUES (?, ?, ?, ?, 'DOCUMENT', ?, 'SUCCESS', 'internal message',
                        CAST('{"reason":"role"}' AS jsonb), ?)
                """, id, ws, actor, eventType, UUID.randomUUID(), Timestamp.from(createdAt));
    }
}
