package com.onboardos.onboarding.document;

import static org.assertj.core.api.Assertions.assertThat;

import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentRepository;
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
class DocumentRepositoryIntegrationTest {
    @Autowired DocumentRepository repository;
    @Autowired JdbcTemplate jdbc;

    private UUID workspaceId;
    private UUID otherWorkspaceId;

    @BeforeEach void setUp() {
        workspaceId = UUID.randomUUID();
        otherWorkspaceId = UUID.randomUUID();
        insertWorkspace(workspaceId, "docs-" + workspaceId);
        insertWorkspace(otherWorkspaceId, "other-" + otherWorkspaceId);
        Instant base = Instant.parse("2026-01-01T00:00:00Z");
        insertDocument(workspaceId, "old-ready", "READY", "WORKSPACE", "[]", base.plusSeconds(1), false);
        insertDocument(workspaceId, "new-pending", "PENDING", "WORKSPACE", "[]", base.plusSeconds(5), false);
        insertDocument(workspaceId, "manager-ready", "READY", "RESTRICTED", "[\"MANAGER\"]", base.plusSeconds(4), false);
        insertDocument(workspaceId, "admin-only", "READY", "RESTRICTED", "[\"ADMIN\"]", base.plusSeconds(3), false);
        insertDocument(workspaceId, "owner-admin-default", "FAILED", "RESTRICTED", "[]", base.plusSeconds(2), false);
        insertDocument(workspaceId, "deleted", "READY", "WORKSPACE", "[]", base.plusSeconds(6), true);
        insertDocument(otherWorkspaceId, "other-workspace", "READY", "WORKSPACE", "[]", base.plusSeconds(7), false);
    }

    @Test void queryPaginatesAfterApplyingAclAndOrdersByCreatedAtDescending() {
        Page<DocumentEntity> first = repository.findAccessible(workspaceId, "MANAGER", null, PageRequest.of(0, 2));
        Page<DocumentEntity> second = repository.findAccessible(workspaceId, "MANAGER", null, PageRequest.of(1, 2));
        Page<DocumentEntity> empty = repository.findAccessible(workspaceId, "MANAGER", null, PageRequest.of(2, 2));
        assertThat(first.getContent()).extracting(DocumentEntity::getTitle)
                .containsExactly("new-pending", "manager-ready");
        assertThat(second.getContent()).extracting(DocumentEntity::getTitle).containsExactly("old-ready");
        assertThat(empty.getContent()).isEmpty();
        assertThat(first.getTotalElements()).isEqualTo(3);
        assertThat(first.getTotalPages()).isEqualTo(2);
    }

    @Test void statusAndAclAlsoApplyToCountQuery() {
        Page<DocumentEntity> managerReady = repository.findAccessible(
                workspaceId, "MANAGER", "READY", PageRequest.of(0, 20));
        assertThat(managerReady.getContent()).extracting(DocumentEntity::getTitle)
                .containsExactly("manager-ready", "old-ready");
        assertThat(managerReady.getTotalElements()).isEqualTo(2);

        Page<DocumentEntity> owner = repository.findAccessible(workspaceId, "OWNER", null, PageRequest.of(0, 20));
        assertThat(owner.getContent()).extracting(DocumentEntity::getTitle)
                .containsExactly("new-pending", "owner-admin-default", "old-ready");
        assertThat(owner.getTotalElements()).isEqualTo(3);
    }

    @Test void equalCreatedAtUsesIdDescendingAcrossPagesWithoutDuplicatesOrGaps() {
        Instant sameCreatedAt = Instant.parse("2026-01-01T00:01:00Z");
        UUID lowerId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID higherId = UUID.fromString("00000000-0000-0000-0000-000000000002");
        insertDocument(lowerId, workspaceId, "same-time-lower-id", "READY", "WORKSPACE", "[]",
                sameCreatedAt, false);
        insertDocument(higherId, workspaceId, "same-time-higher-id", "READY", "WORKSPACE", "[]",
                sameCreatedAt, false);

        Page<DocumentEntity> first = repository.findAccessible(
                workspaceId, "MANAGER", "READY", PageRequest.of(0, 1));
        Page<DocumentEntity> second = repository.findAccessible(
                workspaceId, "MANAGER", "READY", PageRequest.of(1, 1));

        assertThat(first.getContent()).extracting(DocumentEntity::getId).containsExactly(higherId);
        assertThat(second.getContent()).extracting(DocumentEntity::getId).containsExactly(lowerId);
        assertThat(first.getContent().get(0).getId()).isNotEqualTo(second.getContent().get(0).getId());
    }

    private void insertWorkspace(UUID id, String slug) {
        jdbc.update("INSERT INTO workspaces (id, name, slug) VALUES (?, ?, ?)", id, slug, slug);
    }

    private void insertDocument(UUID ws, String title, String status, String visibility, String roles,
            Instant createdAt, boolean deleted) {
        insertDocument(UUID.randomUUID(), ws, title, status, visibility, roles, createdAt, deleted);
    }

    private void insertDocument(UUID id, UUID ws, String title, String status, String visibility, String roles,
            Instant createdAt, boolean deleted) {
        jdbc.update("""
                INSERT INTO documents
                    (id, workspace_id, title, storage_key, status, visibility, allowed_roles,
                     chunk_count, created_at, updated_at, deleted_at)
                VALUES (?, ?, ?, ?, ?, ?, CAST(? AS jsonb), 0, ?, ?, ?)
                """, id, ws, title, title, status, visibility, roles,
                Timestamp.from(createdAt), Timestamp.from(createdAt), deleted ? Timestamp.from(createdAt.plusSeconds(1)) : null);
    }
}
