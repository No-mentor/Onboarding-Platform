package com.onboardos.onboarding.chat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.onboardos.onboarding.ai.EmbeddingService;
import com.onboardos.onboarding.ai.AiProperties;
import com.onboardos.onboarding.ai.LlmService;
import com.onboardos.onboarding.audit.AuditService;
import com.onboardos.onboarding.document.search.DocumentChunkVectorRepository;
import com.onboardos.onboarding.document.service.DocumentPermissionService;
import com.onboardos.onboarding.domain.chat.ChatMessageRepository;
import com.onboardos.onboarding.domain.chat.ChatSessionRepository;
import com.onboardos.onboarding.domain.document.DocumentChunk;
import com.onboardos.onboarding.domain.document.DocumentChunkRepository;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ChatRetrievalTest {
    private final DocumentChunkRepository chunkRepository = mock(DocumentChunkRepository.class);
    private final DocumentChunkVectorRepository vectorRepository = mock(DocumentChunkVectorRepository.class);
    private final EmbeddingService embeddingService = mock(EmbeddingService.class);
    private final ChatService service = new ChatService(
            mock(ChatSessionRepository.class), mock(ChatMessageRepository.class), chunkRepository, vectorRepository,
            mock(DocumentRepository.class), new DocumentPermissionService(), mock(WorkspaceAccessService.class),
            mock(AuditService.class), embeddingService, mock(LlmService.class), new KoreanKeywordExtractor(),
            new AiProperties());
    private final UUID workspaceId = UUID.randomUUID();

    @Test void disabledEmbeddingSearchesMultipleNormalizedKeywords() {
        when(embeddingService.isEnabled()).thenReturn(false);

        service.retrieve(workspaceId, "보안 교육의 마감일을 알려주세요.");

        verify(chunkRepository).searchByKeyword(workspaceId, "보안", 10);
        verify(chunkRepository).searchByKeyword(workspaceId, "교육", 10);
        verify(chunkRepository).searchByKeyword(workspaceId, "마감일", 10);
        verify(vectorRepository, never()).searchByVector(any(), any(), anyInt());
    }

    @Test void vectorHitsSkipKeywordFallback() {
        DocumentChunk vectorHit = chunk(UUID.randomUUID(), 0, "vector");
        when(embeddingService.isEnabled()).thenReturn(true);
        when(embeddingService.embed("마감일을 알려줘")).thenReturn(new float[] {1f});
        when(embeddingService.toPgVectorLiteral(any())).thenReturn("[1]");
        when(vectorRepository.searchByVector(workspaceId, "[1]", 20)).thenReturn(List.of(vectorHit));

        assertThat(service.retrieve(workspaceId, "마감일을 알려줘")).containsExactly(vectorHit);
        verify(chunkRepository, never()).searchByKeyword(any(), any(), anyInt());
    }

    @Test void emptyVectorResultFallsBackToKeywords() {
        when(embeddingService.isEnabled()).thenReturn(true);
        when(embeddingService.embed(any())).thenReturn(new float[] {1f});
        when(embeddingService.toPgVectorLiteral(any())).thenReturn("[1]");
        when(vectorRepository.searchByVector(workspaceId, "[1]", 20)).thenReturn(List.of());

        service.retrieve(workspaceId, "교육의 마감일을 알려줘");

        verify(chunkRepository).searchByKeyword(workspaceId, "교육", 10);
        verify(chunkRepository).searchByKeyword(workspaceId, "마감일", 10);
    }

    @Test void deduplicatesChunksAndRanksMoreKeywordMatchesFirst() {
        DocumentChunk twoMatches = chunk(UUID.randomUUID(), 1, "교육 담당");
        DocumentChunk oneMatch = chunk(UUID.randomUUID(), 0, "교육");
        when(chunkRepository.searchByKeyword(workspaceId, "교육", 10))
                .thenReturn(List.of(oneMatch, twoMatches));
        when(chunkRepository.searchByKeyword(workspaceId, "담당", 10)).thenReturn(List.of(twoMatches));

        assertThat(service.retrieve(workspaceId, "교육 담당"))
                .containsExactly(twoMatches, oneMatch);
    }

    @Test void limitsCombinedKeywordResultsToTwenty() {
        for (String keyword : List.of("키워드일", "키워드이", "키워드삼")) {
            List<DocumentChunk> chunks = new ArrayList<>();
            for (int index = 0; index < 10; index++) {
                chunks.add(chunk(UUID.randomUUID(), index, keyword + index));
            }
            when(chunkRepository.searchByKeyword(workspaceId, keyword, 10)).thenReturn(chunks);
        }

        assertThat(service.retrieve(workspaceId, "키워드일 키워드이 키워드삼")).hasSize(20);
    }

    @Test void exactKeywordSearchStillWorks() {
        DocumentChunk chunk = chunk(UUID.randomUUID(), 0, "정보보안팀");
        when(chunkRepository.searchByKeyword(workspaceId, "정보보안팀", 10)).thenReturn(List.of(chunk));

        assertThat(service.retrieve(workspaceId, "정보보안팀에 대해 알려줘")).containsExactly(chunk);
    }

    private DocumentChunk chunk(UUID documentId, int index, String content) {
        return DocumentChunk.create(documentId, workspaceId, index, content, "{\"page\":2}");
    }
}
