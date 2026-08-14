package com.onboardos.onboarding.document.service;

import com.onboardos.onboarding.document.storage.DocumentStorage;
import com.onboardos.onboarding.document.ingest.PdfTestSupport;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.onboardos.onboarding.ai.EmbeddingService;
import com.onboardos.onboarding.domain.document.DocumentChunk;
import com.onboardos.onboarding.domain.document.DocumentChunkRepository;
import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import com.onboardos.onboarding.domain.document.DocumentStatus;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@Tag("integration")
@SpringBootTest
@Import(PostgresTestcontainersConfig.class)
@ActiveProfiles("test")
class DocumentReprocessIntegrationTest {

    @Autowired DocumentService documentService;
    @Autowired DocumentRepository documentRepository;
    @Autowired DocumentChunkRepository chunkRepository;
    @Autowired JdbcTemplate jdbc;

    @MockitoBean DocumentStorage storage;
    @MockitoBean EmbeddingService embeddingService;
    @MockitoBean WorkspaceAccessService workspaceAccessService;

    private UUID workspaceId;
    private UUID documentId;
    private List<UUID> originalChunkIds;
    private UserPrincipal principal;

    @BeforeEach
    void setUp() throws Exception {
        workspaceId = UUID.randomUUID();
        documentId = UUID.randomUUID();
        principal = new UserPrincipal(UUID.randomUUID(), "reprocess@example.com", "unused", true);
        originalChunkIds = List.of(UUID.randomUUID(), UUID.randomUUID());

        jdbc.update("INSERT INTO workspaces (id, name, slug) VALUES (?, ?, ?)",
                workspaceId, "reprocess", "reprocess-" + workspaceId);
        jdbc.update("""
                INSERT INTO documents
                    (id, workspace_id, title, storage_key, status, visibility, allowed_roles, chunk_count)
                VALUES (?, ?, 'reprocess.pdf', 'reprocess.pdf', 'READY', 'WORKSPACE', CAST('[]' AS jsonb), 2)
                """, documentId, workspaceId);
        insertChunk(originalChunkIds.get(0), 0, "old page one", 91);
        insertChunk(originalChunkIds.get(1), 1, "old page two", 92);

        when(storage.read("reprocess.pdf")).thenReturn(PdfTestSupport.pdf("new page one", "new page two"));
        when(embeddingService.isEnabled()).thenReturn(false);
    }

    @Test
    void reprocessTwiceReplacesChunksWithoutUniqueConstraintConflict() {
        documentService.reprocess(principal, workspaceId, documentId);
        List<DocumentChunk> firstPass = assertSuccessfulReplacement(originalChunkIds);

        List<UUID> firstPassIds = firstPass.stream().map(DocumentChunk::getId).toList();
        documentService.reprocess(principal, workspaceId, documentId);
        List<DocumentChunk> secondPass = assertSuccessfulReplacement(firstPassIds);

        assertThat(secondPass).extracting(DocumentChunk::getId)
                .doesNotContainAnyElementsOf(originalChunkIds);
    }

    private List<DocumentChunk> assertSuccessfulReplacement(List<UUID> replacedIds) {
        List<DocumentChunk> chunks = chunkRepository.findByDocumentIdOrderByChunkIndexAsc(documentId);
        assertThat(chunks).hasSize(2);
        assertThat(chunks).extracting(DocumentChunk::getId).doesNotContainAnyElementsOf(replacedIds);
        assertThat(chunks).extracting(DocumentChunk::getChunkIndex).containsExactly(0, 1);
        assertThat(chunks).extracting(DocumentChunk::getContent).containsExactly("new page one", "new page two");
        assertThat(chunks).extracting(chunk -> chunk.getMetadata().replace(" ", ""))
                .containsExactly("{\"page\":1}", "{\"page\":2}");

        DocumentEntity document = documentRepository.findById(documentId).orElseThrow();
        assertThat(document.getStatus()).isEqualTo(DocumentStatus.READY);
        assertThat(document.getChunkCount()).isEqualTo(chunks.size());
        return chunks;
    }

    private void insertChunk(UUID chunkId, int index, String content, int page) {
        jdbc.update("""
                INSERT INTO document_chunks
                    (id, document_id, workspace_id, chunk_index, content, metadata)
                VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb))
                """, chunkId, documentId, workspaceId, index, content, "{\"page\":" + page + "}");
    }
}
