package com.onboardos.onboarding.chat;

import com.onboardos.onboarding.ai.EmbeddingService;
import com.onboardos.onboarding.ai.LlmService;
import com.onboardos.onboarding.audit.AuditService;
import com.onboardos.onboarding.chat.dto.ChatMessageResponse;
import com.onboardos.onboarding.chat.dto.ChatSessionDetailResponse;
import com.onboardos.onboarding.chat.dto.ChatSessionSummaryResponse;
import com.onboardos.onboarding.chat.dto.SendMessageRequest;
import com.onboardos.onboarding.chat.dto.SendMessageResponse;
import com.onboardos.onboarding.document.DocumentChunkVectorRepository;
import com.onboardos.onboarding.document.DocumentPermissionService;
import com.onboardos.onboarding.domain.chat.ChatMessage;
import com.onboardos.onboarding.domain.chat.ChatMessageRepository;
import com.onboardos.onboarding.domain.chat.ChatSession;
import com.onboardos.onboarding.domain.chat.ChatSessionRepository;
import com.onboardos.onboarding.domain.document.DocumentChunk;
import com.onboardos.onboarding.domain.document.DocumentChunkRepository;
import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final DocumentChunkRepository chunkRepository;
    private final DocumentChunkVectorRepository vectorRepository;
    private final DocumentRepository documentRepository;
    private final DocumentPermissionService permissionService;
    private final WorkspaceAccessService workspaceAccessService;
    private final AuditService auditService;
    private final EmbeddingService embeddingService;
    private final LlmService llmService;

    @Transactional
    public SendMessageResponse send(UserPrincipal principal, UUID workspaceId, SendMessageRequest request) {
        Membership membership = workspaceAccessService.requireMembership(workspaceId, principal.getId());
        String question = request.message() == null ? "" : request.message().trim();
        if (question.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "메시지가 비어 있습니다.");
        }

        ChatSession session;
        if (request.sessionId() != null) {
            session = sessionRepository
                    .findByIdAndWorkspaceIdAndUserIdAndDeletedAtIsNull(
                            request.sessionId(), workspaceId, principal.getId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "세션이 없습니다."));
        } else {
            String title = question.length() > 40 ? question.substring(0, 40) + "…" : question;
            session = ChatSession.create(workspaceId, principal.getId(), title);
            sessionRepository.save(session);
        }
        session.touchTitle(question);

        messageRepository.save(ChatMessage.user(session.getId(), workspaceId, principal.getId(), question));

        List<DocumentChunk> candidates = retrieve(workspaceId, question);

        List<Map<String, Object>> citations = new ArrayList<>();
        List<String> denied = new ArrayList<>();
        List<String> allowedSnippets = new ArrayList<>();

        Map<UUID, DocumentEntity> docCache = new HashMap<>();
        for (DocumentChunk chunk : candidates) {
            DocumentEntity doc = docCache.computeIfAbsent(
                    chunk.getDocumentId(),
                    id -> documentRepository.findById(id).orElse(null)
            );
            if (doc == null || doc.isDeleted()) {
                continue;
            }
            if (!permissionService.canAccess(doc, membership)) {
                if (!denied.contains(doc.getId().toString())) {
                    denied.add(doc.getId().toString());
                }
                continue;
            }
            Map<String, Object> citation = new LinkedHashMap<>();
            citation.put("documentId", doc.getId().toString());
            citation.put("title", doc.getTitle());
            citation.put("chunkId", chunk.getId().toString());
            String snippet = chunk.getContent();
            citation.put("snippet", snippet.length() > 180 ? snippet.substring(0, 180) + "…" : snippet);
            citations.add(citation);
            allowedSnippets.add("[" + doc.getTitle() + "] " + citation.get("snippet"));
            if (citations.size() >= 5) {
                break;
            }
        }

        String answer;
        String result;
        String model = "template-rag-v1";
        if (citations.isEmpty()) {
            if (!denied.isEmpty()) {
                answer = "접근 권한이 있는 문서에서 확인된 근거가 없어 답변드릴 수 없습니다. 관리자에게 권한을 요청하세요.";
                result = "DENIED";
            } else {
                answer = "접근 가능한 근거 문서가 없습니다. 관련 문서를 업로드·임베딩(READY)한 뒤 다시 질문해 주세요.";
                result = "SUCCESS";
            }
        } else {
            String llmAnswer = llmService.answerWithCitations(question, allowedSnippets);
            if (llmAnswer != null && !llmAnswer.isBlank()) {
                answer = llmAnswer;
                model = llmService.modelName();
            } else {
                answer = buildGroundedAnswer(question, allowedSnippets);
            }
            result = "SUCCESS";
        }

        ChatMessage assistant = ChatMessage.assistant(
                session.getId(),
                workspaceId,
                principal.getId(),
                answer,
                citations,
                denied,
                model
        );
        messageRepository.save(assistant);

        auditService.record(
                workspaceId,
                principal.getId(),
                "CHAT_QUERY",
                "CHAT_SESSION",
                session.getId(),
                result,
                question,
                Map.of(
                        "citations", citations.size(),
                        "denied", denied.size(),
                        "model", model,
                        "vectorSearch", embeddingService.isEnabled()
                )
        );
        if (!denied.isEmpty()) {
            auditService.record(
                    workspaceId,
                    principal.getId(),
                    "DOC_ACCESS_DENIED",
                    "DOCUMENT",
                    null,
                    "DENIED",
                    "Chat retrieval denied some documents",
                    Map.of("documentIds", denied)
            );
        }

        return new SendMessageResponse(
                session.getId(),
                assistant.getId(),
                "assistant",
                answer,
                citations,
                denied,
                assistant.getCreatedAt()
        );
    }

    private List<DocumentChunk> retrieve(UUID workspaceId, String question) {
        if (embeddingService.isEnabled()) {
            float[] qVec = embeddingService.embed(question);
            String literal = embeddingService.toPgVectorLiteral(qVec);
            if (literal != null) {
                List<DocumentChunk> vectorHits = vectorRepository.searchByVector(workspaceId, literal, 20);
                if (!vectorHits.isEmpty()) {
                    return vectorHits;
                }
            }
        }
        String keyword = extractKeyword(question);
        return chunkRepository.searchByKeyword(workspaceId, keyword, 20);
    }

    @Transactional(readOnly = true)
    public List<ChatSessionSummaryResponse> sessions(UserPrincipal principal, UUID workspaceId) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());
        return sessionRepository
                .findByWorkspaceIdAndUserIdAndDeletedAtIsNullOrderByUpdatedAtDesc(workspaceId, principal.getId())
                .stream()
                .map(s -> new ChatSessionSummaryResponse(s.getId(), s.getTitle(), s.getUpdatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public ChatSessionDetailResponse sessionDetail(UserPrincipal principal, UUID workspaceId, UUID sessionId) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());
        ChatSession session = sessionRepository
                .findByIdAndWorkspaceIdAndUserIdAndDeletedAtIsNull(sessionId, workspaceId, principal.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        List<ChatMessageResponse> messages = messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream()
                .map(m -> new ChatMessageResponse(
                        m.getId(),
                        m.getRole(),
                        m.getContent(),
                        m.getCitations(),
                        m.getCreatedAt()
                ))
                .toList();
        return new ChatSessionDetailResponse(session.getId(), messages);
    }

    private String extractKeyword(String question) {
        String cleaned = question.replaceAll("[?？!.,]", " ").trim();
        String[] parts = cleaned.split("\\s+");
        if (parts.length == 0) {
            return cleaned.length() > 2 ? cleaned.substring(0, Math.min(10, cleaned.length())) : cleaned;
        }
        String best = parts[0];
        for (String p : parts) {
            if (p.length() > best.length()) {
                best = p;
            }
        }
        return best.length() < 2 ? cleaned : best;
    }

    private String buildGroundedAnswer(String question, List<String> snippets) {
        StringBuilder sb = new StringBuilder();
        sb.append("질문: ").append(question).append("\n\n");
        sb.append("회사 문서에서 확인된 근거를 바탕으로 정리하면 다음과 같습니다.\n\n");
        for (String s : snippets) {
            sb.append("- ").append(s).append("\n");
        }
        sb.append("\n※ Citation 문서 근거 기반 답변입니다. (OpenAI 미설정 시 템플릿 모드)");
        return sb.toString();
    }
}
