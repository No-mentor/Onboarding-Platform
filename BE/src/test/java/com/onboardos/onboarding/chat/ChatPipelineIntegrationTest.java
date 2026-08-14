package com.onboardos.onboarding.chat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onboardos.onboarding.ai.EmbeddingService;
import com.onboardos.onboarding.ai.LlmService;
import com.onboardos.onboarding.ai.embedding.EmbeddingClient;
import com.onboardos.onboarding.document.DocumentChunkVectorRepository;
import com.onboardos.onboarding.support.PostgresTestcontainersConfig;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.UUID;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

/**
 * #50(임베딩)~#53(LLM 답변) 전체 파이프라인을 처음부터 끝까지(업로드 → 임베딩 저장 →
 * 검색 → Permission Check → LLM 답변)를 실제 HTTP API 레벨에서 검증한다.
 * OpenAI 네트워크 호출 지점(EmbeddingClient/LlmService)만 결정론적 mock으로 대체하고,
 * 나머지(DocumentIngestService, ChatService, pgvector 검색, Permission Check, Audit)는
 * 전부 실제 코드로 실행한다. "의역 질문이 실제로 의미상 맞게 검색되는가"처럼 mock으로
 * 증명할 수 없는 부분은 ChatPipelineManualAiVerificationTest(수동 전용)가 담당한다.
 */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestcontainersConfig.class)
@ActiveProfiles("test")
class ChatPipelineIntegrationTest {

    @Autowired org.springframework.test.web.servlet.MockMvc mockMvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired DocumentChunkVectorRepository vectorRepository;
    @Autowired EmbeddingService embeddingService;

    @MockitoBean EmbeddingClient embeddingClient;
    @MockitoBean LlmService llmService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test void uploadTransitionsToReadyAndStoresEmbedding() throws Exception {
        when(embeddingClient.isReady()).thenReturn(true);
        when(embeddingClient.embedAll(anyList())).thenAnswer(inv -> {
            List<String> texts = inv.getArgument(0);
            return texts.stream().map(this::vectorFor).toList();
        });

        String token = signup("uploader");
        String workspaceId = createWorkspace(token, "pipeline-upload");

        MvcResult upload = mockMvc.perform(multipart("/api/v1/documents")
                        .file(pdfFile())
                        .param("title", "Leave Policy")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("READY"))
                .andReturn();

        String documentId = json(upload).get("id").asText();

        Integer nullEmbeddingCount = jdbc.queryForObject(
                "SELECT count(*) FROM document_chunks WHERE document_id = ? AND embedding IS NULL",
                Integer.class, UUID.fromString(documentId));
        assertThat(nullEmbeddingCount).isZero();
    }

    @Test void chatRetrievesSeededDocumentAsCitation() throws Exception {
        when(embeddingClient.isReady()).thenReturn(true);
        stubEmbeddingByHash();
        when(llmService.isEnabled()).thenReturn(true);
        when(llmService.answerWithCitations(any(), any())).thenReturn("휴가는 인사팀에 이메일로 신청하시면 됩니다. [1]");
        when(llmService.modelName()).thenReturn("gpt-4o-mini");

        String token = signup("asker");
        String workspaceId = createWorkspace(token, "pipeline-retrieve");
        String content = "휴가 신청은 인사팀에 이메일로 요청하면 됩니다.";
        UUID documentId = seedReadyDocumentWithChunk(workspaceId, "Leave Guide", content);

        MvcResult chat = sendMessage(token, workspaceId, content);

        assertThat(chat.getResponse().getStatus()).isEqualTo(200);
        JsonNode body = json(chat);
        assertThat(body.get("citations").get(0).get("documentId").asText()).isEqualTo(documentId.toString());
        assertThat(body.get("citations").get(0).has("page")).isTrue();
        assertThat(body.get("answer").asText()).contains("인사팀");
    }

    @Test void chatNeverReturnsAnotherWorkspacesDocument() throws Exception {
        when(embeddingClient.isReady()).thenReturn(true);
        stubEmbeddingByHash();
        when(llmService.isEnabled()).thenReturn(true);
        when(llmService.answerWithCitations(any(), any())).thenReturn("A workspace 문서 기반 답변 [1]");
        when(llmService.modelName()).thenReturn("gpt-4o-mini");

        String tokenA = signup("wsA-owner");
        String workspaceA = createWorkspace(tokenA, "pipeline-iso-a");
        String content = "동일한 문구를 가진 청크입니다.";
        UUID documentA = seedReadyDocumentWithChunk(workspaceA, "Doc A", content);

        String tokenB = signup("wsB-owner");
        String workspaceB = createWorkspace(tokenB, "pipeline-iso-b");
        seedReadyDocumentWithChunk(workspaceB, "Doc B", content);

        MvcResult chatB = sendMessage(tokenB, workspaceB, content);
        JsonNode bodyB = json(chatB);
        for (JsonNode citation : bodyB.get("citations")) {
            assertThat(citation.get("documentId").asText()).isNotEqualTo(documentA.toString());
        }
    }

    @Test void chatReturnsStandardMessageWhenWorkspaceHasNoDocuments() throws Exception {
        when(embeddingClient.isReady()).thenReturn(true);
        stubEmbeddingByHash();

        String token = signup("empty-ws");
        String workspaceId = createWorkspace(token, "pipeline-empty");

        MvcResult chat = sendMessage(token, workspaceId, "아무 문서도 없는 워크스페이스 질문");

        JsonNode body = json(chat);
        assertThat(body.get("citations")).isEmpty();
        assertThat(body.get("answer").asText())
                .isEqualTo("접근 가능한 근거 문서가 없습니다. 관련 문서를 업로드·임베딩(READY)한 뒤 다시 질문해 주세요.");
        org.mockito.Mockito.verify(llmService, org.mockito.Mockito.never()).answerWithCitations(any(), any());
    }

    @Test void chatDeniesRestrictedDocumentWithoutExposingContent() throws Exception {
        when(embeddingClient.isReady()).thenReturn(true);
        stubEmbeddingByHash();

        String ownerToken = signup("restricted-owner");
        String workspaceId = createWorkspace(ownerToken, "pipeline-denied");
        String content = "연봉표는 여기 있습니다.";
        seedReadyDocumentWithChunk(
                workspaceId, "Salary Table", content, "RESTRICTED", "[\"ADMIN\"]");

        UUID memberUserId = signupAndReturnUserId("restricted-member");
        jdbc.update(
                "INSERT INTO memberships (id, workspace_id, user_id, role, status, joined_at) "
                        + "VALUES (?, ?, ?, 'MEMBER', 'ACTIVE', now())",
                UUID.randomUUID(), UUID.fromString(workspaceId), memberUserId);
        String memberToken = login(memberUserId);

        MvcResult chat = sendMessage(memberToken, workspaceId, content);

        JsonNode body = json(chat);
        assertThat(body.get("citations")).isEmpty();
        assertThat(body.get("answer").asText())
                .isEqualTo("접근 권한이 있는 문서에서 확인된 근거가 없어 답변드릴 수 없습니다. 관리자에게 권한을 요청하세요.");
        assertThat(body.get("permissionDeniedDocumentIds")).isNotEmpty();
        org.mockito.Mockito.verify(llmService, org.mockito.Mockito.never()).answerWithCitations(any(), any());
    }

    @Test void chatLlmFailureReturns503AndRecordsAuditIndependently() throws Exception {
        when(embeddingClient.isReady()).thenReturn(true);
        stubEmbeddingByHash();
        when(llmService.isEnabled()).thenReturn(true);
        when(llmService.answerWithCitations(any(), any())).thenThrow(new RuntimeException("OpenAI timeout"));
        when(llmService.modelName()).thenReturn("gpt-4o-mini");

        String token = signup("llm-fail");
        String workspaceId = createWorkspace(token, "pipeline-llmfail");
        String content = "LLM 실패 테스트용 청크";
        seedReadyDocumentWithChunk(workspaceId, "Doc", content);

        mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"%s\"}".formatted(content)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("AI_PROVIDER_ERROR"));

        Integer errorAuditCount = jdbc.queryForObject(
                "SELECT count(*) FROM audit_logs WHERE workspace_id = ? AND event_type = 'CHAT_QUERY' AND result = 'ERROR'",
                Integer.class, UUID.fromString(workspaceId));
        assertThat(errorAuditCount).isEqualTo(1);
    }

    @Test void chatFallsBackToKeywordAndTemplateWhenAiDisabled() throws Exception {
        when(embeddingClient.isReady()).thenReturn(false);
        when(llmService.isEnabled()).thenReturn(false);

        String token = signup("ai-disabled");
        String workspaceId = createWorkspace(token, "pipeline-disabled");
        String content = "키워드검색용특이어휘고도화문서";
        seedReadyDocumentWithChunk(workspaceId, "Doc", content);

        MvcResult chat = sendMessage(token, workspaceId, "고도화");

        JsonNode body = json(chat);
        assertThat(body.get("citations")).isNotEmpty();
        assertThat(body.get("answer").asText()).contains("OpenAI 미설정 시 템플릿 모드");
        // embeddingService.isEnabled()는 ChatService.retrieve()에서 호출 전에 체크되므로 벡터 검색 자체가 생략된다
        // (LlmService와 달리, disabled 체크가 호출자 쪽에 있음)
        org.mockito.Mockito.verify(embeddingClient, org.mockito.Mockito.never()).embedAll(any());
    }

    @Test void koreanParticleFallbackReturnsPageTwoCitationWhenAiDisabled() throws Exception {
        when(embeddingClient.isReady()).thenReturn(false);
        when(llmService.answerWithCitations(any(), any())).thenReturn(null);

        String token = signup("korean-keyword");
        String workspaceId = createWorkspace(token, "korean-keyword");
        String content = "테스트 보안 교육 마감일은 입사 후 7일 이내입니다. 교육 담당 부서는 정보보안팀입니다.";
        seedReadyDocumentWithChunk(workspaceId, "온보딩 보안 교육", content);

        JsonNode body = json(sendMessage(
                token, workspaceId, "테스트 보안 교육의 담당 부서와 마감일을 알려줘."));

        assertThat(body.get("answer").asText()).contains("입사 후 7일 이내", "정보보안팀");
        assertThat(body.get("citations")).hasSize(1);
        assertThat(body.get("citations").get(0).get("page").asInt()).isEqualTo(2);
    }

    private void stubEmbeddingByHash() {
        when(embeddingClient.embedAll(anyList())).thenAnswer(inv -> {
            List<String> texts = inv.getArgument(0);
            return texts.stream().map(this::vectorFor).toList();
        });
    }

    private float[] vectorFor(String text) {
        float[] vector = new float[1536];
        vector[Math.floorMod(text.hashCode(), 1536)] = 1f;
        return vector;
    }

    private MvcResult sendMessage(String token, String workspaceId, String message) throws Exception {
        return mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("message", message))))
                .andExpect(status().isOk())
                .andReturn();
    }

    private UUID seedReadyDocumentWithChunk(String workspaceId, String title, String content) {
        return seedReadyDocumentWithChunk(workspaceId, title, content, "WORKSPACE", "[]");
    }

    private UUID seedReadyDocumentWithChunk(
            String workspaceId, String title, String content, String visibility, String allowedRolesJson
    ) {
        UUID documentId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO documents
                    (id, workspace_id, title, storage_key, status, visibility, allowed_roles, chunk_count)
                VALUES (?, ?, ?, ?, 'READY', ?, CAST(? AS jsonb), 1)
                """, documentId, UUID.fromString(workspaceId), title, "seed/" + documentId, visibility, allowedRolesJson);

        UUID chunkId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO document_chunks (id, document_id, workspace_id, chunk_index, content, metadata)
                VALUES (?, ?, ?, 0, ?, CAST('{"page":2}' AS jsonb))
                """, chunkId, documentId, UUID.fromString(workspaceId), content);

        vectorRepository.updateEmbedding(chunkId, embeddingService.toPgVectorLiteral(vectorFor(content)));
        return documentId;
    }

    private MockMultipartFile pdfFile() throws Exception {
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream stream = new PDPageContentStream(document, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                stream.newLineAtOffset(50, 700);
                stream.showText("Leave policy content");
                stream.endText();
            }
            document.save(output);
            return new MockMultipartFile(
                    "file", "leave-policy.pdf", "application/pdf", output.toByteArray());
        }
    }

    private String signup(String prefix) throws Exception {
        String email = prefix + "_" + System.nanoTime() + "@example.com";
        MvcResult result = mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"password1\",\"name\":\"%s\"}".formatted(email, prefix)))
                .andExpect(status().isCreated())
                .andReturn();
        return json(result).get("accessToken").asText();
    }

    private UUID signupAndReturnUserId(String prefix) throws Exception {
        String email = prefix + "_" + System.nanoTime() + "@example.com";
        MvcResult result = mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"password1\",\"name\":\"%s\"}".formatted(email, prefix)))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(json(result).get("userId").asText());
    }

    private String login(UUID userId) throws Exception {
        // 로그인 API는 이메일이 필요하므로, 방금 만든 유저의 이메일을 조회해서 재사용한다.
        String email = jdbc.queryForObject("SELECT email FROM users WHERE id = ?", String.class, userId);
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"password1\"}".formatted(email)))
                .andExpect(status().isOk())
                .andReturn();
        return json(result).get("accessToken").asText();
    }

    private String createWorkspace(String token, String slugPrefix) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/workspaces")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Pipeline Corp\",\"slug\":\"%s-%d\"}"
                                .formatted(slugPrefix, System.nanoTime() % 1_000_000)))
                .andExpect(status().isCreated())
                .andReturn();
        return json(result).get("id").asText();
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsByteArray());
    }
}
