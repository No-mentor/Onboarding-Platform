package com.onboardos.onboarding.chat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.onboardos.onboarding.ai.EmbeddingService;
import com.onboardos.onboarding.domain.document.DocumentChunk;
import com.onboardos.onboarding.support.PostgresTestcontainersConfig;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
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
class ChatKeywordSearchIntegrationTest {
    @Autowired ChatService chatService;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean EmbeddingService embeddingService;

    @Test void particleVariantsAndMultipleKeywordsFindReadyPageTwoChunk() {
        UUID workspaceId = workspace("keyword-particles");
        UUID expected = document(workspaceId, "READY", false,
                "온보딩 보안 교육\n테스트 보안 교육 마감일은 입사 후 7일 이내입니다. 교육 담당 부서는 정보보안팀입니다.",
                2);
        when(embeddingService.isEnabled()).thenReturn(false);

        assertThat(chatService.retrieve(workspaceId, "테스트 보안 교육의 담당 부서와 마감일을 알려줘."))
                .extracting(DocumentChunk::getDocumentId).contains(expected);
        assertThat(chatService.retrieve(workspaceId, "보안 교육의 마감일을 알려주세요."))
                .extracting(DocumentChunk::getDocumentId).contains(expected);
        assertThat(chatService.retrieve(workspaceId, "교육 담당 부서가 어디야?"))
                .extracting(DocumentChunk::getDocumentId).contains(expected);
        assertThat(chatService.retrieve(workspaceId, "마감일은 언제야?"))
                .extracting(DocumentChunk::getDocumentId).contains(expected);
        assertThat(chatService.retrieve(workspaceId, "정보보안팀에 대해 알려줘."))
                .singleElement().satisfies(chunk -> {
                    assertThat(chunk.getDocumentId()).isEqualTo(expected);
                    assertThat(chunk.getMetadata().replace(" ", "")).isEqualTo("{\"page\":2}");
                });
    }

    @Test void excludesOtherWorkspaceNonReadyAndSoftDeletedDocuments() {
        UUID workspaceId = workspace("keyword-filters");
        UUID otherWorkspaceId = workspace("keyword-other");
        UUID ready = document(workspaceId, "READY", false, "공통검색어 교육 마감일", 2);
        document(workspaceId, "FAILED", false, "공통검색어 교육 마감일", 1);
        document(workspaceId, "PROCESSING", false, "공통검색어 교육 마감일", 1);
        document(workspaceId, "READY", true, "공통검색어 교육 마감일", 1);
        document(otherWorkspaceId, "READY", false, "공통검색어 교육 마감일", 1);

        assertThat(chatService.retrieve(workspaceId, "공통검색어 교육의 마감일을"))
                .extracting(DocumentChunk::getDocumentId).containsExactly(ready);
    }

    @Test void deduplicatesRanksByMatchCountAndLimitsResultsDeterministically() {
        UUID workspaceId = workspace("keyword-ranking");
        UUID best = document(workspaceId, "READY", false, "교육 담당 마감일", 2);
        document(workspaceId, "READY", false, "교육 안내", 1);

        List<UUID> bulkIds = new ArrayList<>();
        for (String keyword : List.of("검색하나", "검색둘", "검색셋")) {
            for (int index = 0; index < 10; index++) {
                bulkIds.add(document(workspaceId, "READY", false, keyword + " 내용 " + index, 1));
            }
        }

        List<DocumentChunk> ranked = chatService.retrieve(workspaceId, "교육 담당 마감일");
        assertThat(ranked.get(0).getDocumentId()).isEqualTo(best);
        assertThat(ranked.stream().map(DocumentChunk::getId).distinct().count()).isEqualTo(ranked.size());

        List<UUID> first = chatService.retrieve(workspaceId, "검색하나 검색둘 검색셋").stream()
                .map(DocumentChunk::getId).toList();
        List<UUID> second = chatService.retrieve(workspaceId, "검색하나 검색둘 검색셋").stream()
                .map(DocumentChunk::getId).toList();
        assertThat(first).hasSize(20).isEqualTo(second);
        assertThat(first).doesNotHaveDuplicates();
    }

    private UUID workspace(String prefix) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO workspaces (id, name, slug) VALUES (?, ?, ?)",
                id, prefix, prefix + "-" + id);
        return id;
    }

    private UUID document(UUID workspaceId, String status, boolean deleted, String content, int page) {
        UUID documentId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO documents
                    (id, workspace_id, title, storage_key, status, visibility, allowed_roles, chunk_count, deleted_at)
                VALUES (?, ?, ?, ?, ?, 'WORKSPACE', CAST('[]' AS jsonb), 1,
                        CASE WHEN ? THEN now() ELSE NULL END)
                """, documentId, workspaceId, "doc-" + documentId, "seed/" + documentId, status, deleted);
        jdbc.update("""
                INSERT INTO document_chunks
                    (id, document_id, workspace_id, chunk_index, content, metadata)
                VALUES (?, ?, ?, 0, ?, CAST(? AS jsonb))
                """, UUID.randomUUID(), documentId, workspaceId, content, "{\"page\":" + page + "}");
        return documentId;
    }
}
