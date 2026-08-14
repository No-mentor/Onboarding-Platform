package com.onboardos.onboarding.chat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.onboardos.onboarding.ai.EmbeddingService;
import com.onboardos.onboarding.ai.LlmService;
import com.onboardos.onboarding.audit.AuditService;
import com.onboardos.onboarding.chat.dto.SendMessageRequest;
import com.onboardos.onboarding.chat.dto.SendMessageResponse;
import com.onboardos.onboarding.document.DocumentChunkVectorRepository;
import com.onboardos.onboarding.document.DocumentPermissionService;
import com.onboardos.onboarding.domain.chat.ChatMessageRepository;
import com.onboardos.onboarding.domain.chat.ChatSessionRepository;
import com.onboardos.onboarding.domain.document.DocumentChunk;
import com.onboardos.onboarding.domain.document.DocumentChunkRepository;
import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import com.onboardos.onboarding.domain.document.DocumentVisibility;
import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ChatServiceTest {

    private final ChatSessionRepository sessionRepository = mock(ChatSessionRepository.class);
    private final ChatMessageRepository messageRepository = mock(ChatMessageRepository.class);
    private final DocumentChunkRepository chunkRepository = mock(DocumentChunkRepository.class);
    private final DocumentChunkVectorRepository vectorRepository = mock(DocumentChunkVectorRepository.class);
    private final DocumentRepository documentRepository = mock(DocumentRepository.class);
    private final DocumentPermissionService permissionService = new DocumentPermissionService();
    private final WorkspaceAccessService workspaceAccessService = mock(WorkspaceAccessService.class);
    private final AuditService auditService = mock(AuditService.class);
    private final EmbeddingService embeddingService = mock(EmbeddingService.class);
    private final LlmService llmService = mock(LlmService.class);

    private final ChatService service = new ChatService(
            sessionRepository, messageRepository, chunkRepository, vectorRepository, documentRepository,
            permissionService, workspaceAccessService, auditService, embeddingService, llmService,
            new KoreanKeywordExtractor()
    );

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();
    private final UserPrincipal principal = new UserPrincipal(userId, "user@test.local", "hash", true);

    @Test void llmSuccessUsesLlmAnswerAndIncludesPageKeyInCitations() {
        DocumentEntity doc = accessibleDocument();
        stubSearch(List.of(chunkOf(doc)));
        when(embeddingService.isEnabled()).thenReturn(false);
        when(llmService.answerWithCitations(anyString(), anyList())).thenReturn("LLM 답변 [1]");
        when(llmService.modelName()).thenReturn("gpt-4o-mini");

        SendMessageResponse response = service.send(principal, workspaceId, request("질문입니다"));

        assertThat(response.answer()).isEqualTo("LLM 답변 [1]");
        assertThat(response.citations()).hasSize(1);
        assertThat(response.citations().get(0)).containsKey("page");
        assertThat(response.citations().get(0).get("page")).isEqualTo(7);
    }

    @Test void llmDisabledFallsBackToTemplateAnswer() {
        DocumentEntity doc = accessibleDocument();
        stubSearch(List.of(chunkOf(doc)));
        when(embeddingService.isEnabled()).thenReturn(false);
        when(llmService.answerWithCitations(anyString(), anyList())).thenReturn(null);

        SendMessageResponse response = service.send(principal, workspaceId, request("질문입니다"));

        assertThat(response.answer()).contains("OpenAI 미설정 시 템플릿 모드");
    }

    @Test void llmFailureThrowsAiProviderErrorAndRecordsAuditIndependently() {
        DocumentEntity doc = accessibleDocument();
        stubSearch(List.of(chunkOf(doc)));
        when(embeddingService.isEnabled()).thenReturn(false);
        when(llmService.answerWithCitations(anyString(), anyList()))
                .thenThrow(new RuntimeException("OpenAI timeout"));
        when(llmService.modelName()).thenReturn("gpt-4o-mini");

        assertThatThrownBy(() -> service.send(principal, workspaceId, request("질문입니다")))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.AI_PROVIDER_ERROR));

        verify(auditService).recordIndependently(
                any(), any(), any(), any(), any(), any(), any(), any()
        );
        verify(auditService, never()).record(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test void allCandidatesDeniedReturnsDeniedMessageWithoutCallingLlm() {
        DocumentEntity restricted = restrictedDocument();
        stubSearch(List.of(chunkOf(restricted)));
        when(embeddingService.isEnabled()).thenReturn(false);

        SendMessageResponse response = service.send(principal, workspaceId, request("질문입니다"));

        assertThat(response.answer()).isEqualTo(
                "접근 권한이 있는 문서에서 확인된 근거가 없어 답변드릴 수 없습니다. 관리자에게 권한을 요청하세요."
        );
        assertThat(response.citations()).isEmpty();
        assertThat(response.permissionDeniedDocumentIds()).containsExactly(restricted.getId().toString());
        verify(llmService, never()).answerWithCitations(any(), any());
    }

    @Test void noCandidatesReturnsStandardNoEvidenceMessage() {
        stubSearch(List.of());
        when(embeddingService.isEnabled()).thenReturn(false);

        SendMessageResponse response = service.send(principal, workspaceId, request("질문입니다"));

        assertThat(response.answer()).isEqualTo(
                "접근 가능한 근거 문서가 없습니다. 관련 문서를 업로드·임베딩(READY)한 뒤 다시 질문해 주세요."
        );
        assertThat(response.citations()).isEmpty();
        assertThat(response.permissionDeniedDocumentIds()).isEmpty();
        verify(llmService, never()).answerWithCitations(any(), any());
    }

    private SendMessageRequest request(String message) {
        return new SendMessageRequest(null, message, false);
    }

    private void stubSearch(List<DocumentChunk> chunks) {
        when(workspaceAccessService.requireMembership(workspaceId, userId))
                .thenReturn(Membership.create(workspaceId, userId, UserRole.MEMBER, null, null, null));
        when(chunkRepository.searchByKeyword(any(), any(), org.mockito.ArgumentMatchers.anyInt()))
                .thenReturn(chunks);
    }

    private DocumentChunk chunkOf(DocumentEntity doc) {
        DocumentChunk chunk = DocumentChunk.create(doc.getId(), workspaceId, 0, "청크 내용", "{\"page\":7}");
        when(documentRepository.findById(doc.getId())).thenReturn(Optional.of(doc));
        return chunk;
    }

    private DocumentEntity accessibleDocument() {
        return DocumentEntity.create(
                workspaceId, "Doc", "storage/key", "key.pdf", "application/pdf", 100L,
                DocumentVisibility.WORKSPACE, List.of(), UUID.randomUUID()
        );
    }

    private DocumentEntity restrictedDocument() {
        return DocumentEntity.create(
                workspaceId, "Restricted Doc", "storage/key2", "key2.pdf", "application/pdf", 100L,
                DocumentVisibility.RESTRICTED, List.of(UserRole.OWNER), UUID.randomUUID()
        );
    }
}
