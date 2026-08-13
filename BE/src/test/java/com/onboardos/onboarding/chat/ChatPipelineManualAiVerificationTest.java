package com.onboardos.onboarding.chat;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onboardos.onboarding.ai.EmbeddingService;
import com.onboardos.onboarding.document.DocumentChunkVectorRepository;
import com.onboardos.onboarding.support.PostgresTestcontainersConfig;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * 실제 OpenAI API로 "의역 질문이 실제로 의미 기반으로 검색되는가"를 검증한다.
 * mock으로는 증명할 수 없는 항목이라 자동 실행 태스크(test/integrationTest)에 포함하지
 * 않고, {@code manual-ai} 태그로만 분류해 `./gradlew manualAiTest`로 수동 실행한다.
 * OPENAI_API_KEY 환경변수가 없으면 스킵된다 (CI/일반 개발 흐름에서 실패로 오인되지 않도록).
 */
@Tag("manual-ai")
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestcontainersConfig.class)
@ActiveProfiles("test")
class ChatPipelineManualAiVerificationTest {

    @Autowired MockMvc mockMvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired DocumentChunkVectorRepository vectorRepository;
    @Autowired EmbeddingService embeddingService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @DynamicPropertySource
    static void realOpenAiProperties(DynamicPropertyRegistry registry) {
        registry.add("app.ai.enabled", () -> "true");
        registry.add("app.ai.openai-api-key", () -> System.getenv().getOrDefault("OPENAI_API_KEY", ""));
    }

    @BeforeEach
    void requireRealApiKey() {
        String key = System.getenv("OPENAI_API_KEY");
        assumeTrue(key != null && !key.isBlank(),
                "OPENAI_API_KEY 환경변수가 없어 스킵합니다 (실제 API 수동 검증 전용, ./gradlew manualAiTest -Dsystem 필요 없이 env로 전달)");
    }

    @Test
    void realSemanticRetrievalFindsParaphrasedQuestionWithoutLiteralKeywordOverlap() throws Exception {
        assertTrue(embeddingService.isEnabled(), "실제 API 키로 OpenAI 임베딩 클라이언트가 준비되어야 한다");

        String token = signup("manual-ai");
        String workspaceId = createWorkspace(token, "manual-ai-ws");

        String targetContent = "신입 사원은 첫 출근일에 사수와 1:1 미팅을 통해 온보딩 계획을 확인합니다.";
        String distractorContent = "회사의 연차 휴가는 입사 1년 후부터 15일이 부여됩니다.";
        UUID targetDocumentId = seedReadyDocumentWithRealEmbedding(workspaceId, "Onboarding Day1 Guide", targetContent);
        seedReadyDocumentWithRealEmbedding(workspaceId, "Annual Leave Policy", distractorContent);

        String paraphrasedQuestion = "출근 첫날 담당자와 어떤 대화를 나누게 되나요?";

        MvcResult result = mockMvc.perform(post("/api/v1/chat/messages")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                java.util.Map.of("message", paraphrasedQuestion))))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsByteArray());

        System.out.println("========== 실제 OpenAI 의미 기반 검색 수동 검증 결과 ==========");
        System.out.println("질문(문자 그대로 겹치는 단어 없음): " + paraphrasedQuestion);
        System.out.println("답변: " + body.get("answer").asText());
        System.out.println("citations: " + body.get("citations").toPrettyString());
        System.out.println("=============================================================");

        JsonNode firstCitation = body.get("citations").get(0);
        assertTrue(
                firstCitation.get("documentId").asText().equals(targetDocumentId.toString()),
                "1순위 citation은 의미상 관련 있는 target 문서여야 한다 (실제 값은 위 출력 참고)"
        );
    }

    private UUID seedReadyDocumentWithRealEmbedding(String workspaceId, String title, String content) {
        UUID documentId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO documents
                    (id, workspace_id, title, storage_key, status, visibility, allowed_roles, chunk_count)
                VALUES (?, ?, ?, ?, 'READY', 'WORKSPACE', CAST('[]' AS jsonb), 1)
                """, documentId, UUID.fromString(workspaceId), title, "seed/" + documentId);

        UUID chunkId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO document_chunks (id, document_id, workspace_id, chunk_index, content)
                VALUES (?, ?, ?, 0, ?)
                """, chunkId, documentId, UUID.fromString(workspaceId), content);

        float[] realVector = embeddingService.embed(content);
        vectorRepository.updateEmbedding(chunkId, embeddingService.toPgVectorLiteral(realVector));
        return documentId;
    }

    private String signup(String prefix) throws Exception {
        String email = prefix + "_" + System.nanoTime() + "@example.com";
        MvcResult result = mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"password1\",\"name\":\"%s\"}".formatted(email, prefix)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsByteArray()).get("accessToken").asText();
    }

    private String createWorkspace(String token, String slugPrefix) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/workspaces")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Manual AI Corp\",\"slug\":\"%s-%d\"}"
                                .formatted(slugPrefix, System.nanoTime() % 1_000_000)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsByteArray()).get("id").asText();
    }
}
