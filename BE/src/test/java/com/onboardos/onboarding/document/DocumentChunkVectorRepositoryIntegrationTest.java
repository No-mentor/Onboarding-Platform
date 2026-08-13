package com.onboardos.onboarding.document;

import static org.assertj.core.api.Assertions.assertThat;

import com.onboardos.onboarding.domain.document.DocumentChunk;
import com.onboardos.onboarding.support.PostgresTestcontainersConfig;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

/**
 * DocumentChunkVectorRepository.searchByVector()의 workspace_id WHERE 필터가
 * 실제 SQL 레벨에서 적용되는지 검증한다 (mock이 아닌 실제 pgvector/Postgres 대상).
 * 두 workspace의 청크에 "완전히 동일한"(=코사인 거리 0) 임베딩을 넣어서,
 * 의미적으로 가장 가까운 청크라도 workspace가 다르면 절대 반환되지 않아야 함을 보장한다.
 */
@Tag("integration")
@SpringBootTest
@Import(PostgresTestcontainersConfig.class)
@ActiveProfiles("test")
class DocumentChunkVectorRepositoryIntegrationTest {

    @Autowired DocumentChunkVectorRepository vectorRepository;
    @Autowired JdbcTemplate jdbc;

    private UUID workspaceA;
    private UUID workspaceB;
    private UUID chunkA;
    private UUID chunkB;

    @BeforeEach void setUp() {
        workspaceA = UUID.randomUUID();
        workspaceB = UUID.randomUUID();
        insertWorkspace(workspaceA, "ws-a-" + workspaceA);
        insertWorkspace(workspaceB, "ws-b-" + workspaceB);

        UUID documentA = UUID.randomUUID();
        UUID documentB = UUID.randomUUID();
        insertDocument(documentA, workspaceA, "READY");
        insertDocument(documentB, workspaceB, "READY");

        chunkA = UUID.randomUUID();
        chunkB = UUID.randomUUID();
        insertChunk(chunkA, documentA, workspaceA, "workspace A content");
        insertChunk(chunkB, documentB, workspaceB, "workspace B content");

        String identicalVector = vectorLiteral(1f);
        vectorRepository.updateEmbedding(chunkA, identicalVector);
        vectorRepository.updateEmbedding(chunkB, identicalVector);
    }

    @Test void searchByVectorNeverReturnsChunksFromAnotherWorkspaceEvenWithIdenticalEmbedding() {
        String queryVector = vectorLiteral(1f);

        List<DocumentChunk> resultA = vectorRepository.searchByVector(workspaceA, queryVector, 20);
        List<DocumentChunk> resultB = vectorRepository.searchByVector(workspaceB, queryVector, 20);

        assertThat(resultA).extracting(DocumentChunk::getId).containsExactly(chunkA);
        assertThat(resultA).extracting(DocumentChunk::getWorkspaceId).containsOnly(workspaceA);

        assertThat(resultB).extracting(DocumentChunk::getId).containsExactly(chunkB);
        assertThat(resultB).extracting(DocumentChunk::getWorkspaceId).containsOnly(workspaceB);
    }

    private void insertWorkspace(UUID id, String slug) {
        jdbc.update("INSERT INTO workspaces (id, name, slug) VALUES (?, ?, ?)", id, slug, slug);
    }

    private void insertDocument(UUID id, UUID workspaceId, String status) {
        jdbc.update("""
                INSERT INTO documents
                    (id, workspace_id, title, storage_key, status, visibility, allowed_roles, chunk_count)
                VALUES (?, ?, ?, ?, ?, 'WORKSPACE', CAST('[]' AS jsonb), 0)
                """, id, workspaceId, "doc-" + id, "doc-" + id, status);
    }

    private void insertChunk(UUID id, UUID documentId, UUID workspaceId, String content) {
        jdbc.update("""
                INSERT INTO document_chunks (id, document_id, workspace_id, chunk_index, content)
                VALUES (?, ?, ?, 0, ?)
                """, id, documentId, workspaceId, content);
    }

    private String vectorLiteral(float first) {
        StringBuilder sb = new StringBuilder("[").append(first);
        for (int i = 1; i < 1536; i++) {
            sb.append(",0");
        }
        return sb.append(']').toString();
    }
}
