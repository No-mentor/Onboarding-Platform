package com.onboardos.onboarding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onboardos.onboarding.domain.user.EmailVerificationCode;
import com.onboardos.onboarding.domain.user.EmailVerificationCodeRepository;
import com.onboardos.onboarding.support.PostgresTestcontainersConfig;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * 체크리스트 / 30일 계획 / 오늘의 추천 / 대시보드 사이의 상태 동기화를 실제 DB 로 검증한다.
 * Docker 필요. {@code ./gradlew integrationTest} 로 실행.
 */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestcontainersConfig.class)
@ActiveProfiles("test")
class OnboardingSyncIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    EmailVerificationCodeRepository verificationCodeRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private String token;
    private String workspaceId;

    @BeforeEach
    void signupAndCreateWorkspace() throws Exception {
        String email = "sync_" + System.nanoTime() + "@example.com";
        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password1","name":"동기화 테스트"}
                                """.formatted(email)))
                .andExpect(status().isCreated());

        EmailVerificationCode code = verificationCodeRepository.findByEmail(email).orElseThrow();
        mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","code":"%s"}
                                """.formatted(email, code.getCode())))
                .andExpect(status().isOk());

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password1"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn();
        token = json(loginResult).get("accessToken").asText();

        MvcResult ws = mockMvc.perform(post("/api/v1/workspaces")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"SyncCo","slug":"sync-%d"}
                                """.formatted(System.nanoTime() % 100000000)))
                .andExpect(status().isCreated())
                .andReturn();
        workspaceId = json(ws).get("id").asText();
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    /**
     * Scenario A~F: 체크리스트 ↔ 30일 계획 ↔ 오늘의 추천 ↔ 대시보드 상태 동기화 전체 흐름.
     */
    @Test
    @DisplayName("체크리스트/계획/추천/대시보드 상태가 서로 동기화된다")
    void checklistPlanRecommendationDashboardStayInSync() throws Exception {
        // 템플릿: day1 CHECKLIST, day2 PRACTICE 두 항목만 둔다 (진행률 계산을 예측 가능하게)
        MvcResult tpl = mockMvc.perform(post("/api/v1/templates")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"Sync Template",
                                  "targetRole":"OWNER",
                                  "isDefault":true,
                                  "items":[
                                    {"dayIndex":1,"type":"CHECKLIST","title":"확인 업무","sortOrder":0},
                                    {"dayIndex":2,"type":"PRACTICE","title":"실습 항목","sortOrder":0}
                                  ]
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        String templateId = json(tpl).get("id").asText();

        // 계획 생성 (Scenario A 준비)
        MvcResult generated = mockMvc.perform(post("/api/v1/onboarding-plans/generate")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"templateId":"%s","force":false}
                                """.formatted(templateId)))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode plan = json(generated);
        String planId = plan.get("planId").asText();
        String planItemId = plan.get("items").get(0).get("id").asText();
        assertThat(plan.get("items").get(0).get("status").asText()).isEqualTo("PENDING");
        assertThat(plan.get("progressPercent").asDouble()).isEqualTo(0.0);

        // Scenario F: 계획 생성 직후, /recommendations/today 를 먼저 부르지 않고
        // 바로 대시보드에 들어가도 오늘 할 일이 비어 있으면 안 된다.
        MvcResult dashboard = mockMvc.perform(get("/api/v1/dashboard/me")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode dashboardBody = json(dashboard);
        assertThat(dashboardBody.get("today").get("total").asInt())
                .as("대시보드 첫 진입에서도 오늘 할 일이 생성되어 있어야 한다")
                .isGreaterThanOrEqualTo(1);
        boolean dashboardHasOurItem = false;
        for (JsonNode item : dashboardBody.get("today").get("items")) {
            if (planItemId.equals(text(item, "planItemId"))) dashboardHasOurItem = true;
        }
        assertThat(dashboardHasOurItem).isTrue();

        // 체크리스트 항목 id 를 가져온다
        MvcResult checklist = mockMvc.perform(get("/api/v1/checklists/me")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode checklistItems = json(checklist).get("items");
        assertThat(checklistItems).hasSize(1);
        String checklistId = checklistItems.get(0).get("id").asText();
        assertThat(checklistItems.get(0).get("status").asText()).isEqualTo("PENDING");

        // Scenario A: 체크리스트 DONE -> planItem DONE, progress 증가
        mockMvc.perform(patch("/api/v1/checklists/items/{id}", checklistId)
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DONE\"}"))
                .andExpect(status().isOk());

        JsonNode planAfterChecklistDone = json(mockMvc.perform(get("/api/v1/onboarding-plans/{id}", planId)
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andReturn());
        assertThat(planAfterChecklistDone.get("items").get(0).get("status").asText()).isEqualTo("DONE");
        assertThat(planAfterChecklistDone.get("progressPercent").asDouble()).isEqualTo(50.0);

        // 체크리스트 DONE 이 오늘의 추천에도 반영되는지 (Scenario A 연장)
        JsonNode recoAfterChecklistDone = findRecommendationForPlanItem(planItemId, null);
        assertThat(recoAfterChecklistDone.get("status").asText()).isEqualTo("DONE");

        // Scenario B: 30일 계획에서 완료 취소 -> 체크리스트 PENDING, progress 재계산
        mockMvc.perform(patch("/api/v1/onboarding-plans/items/{id}", planItemId)
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PENDING\"}"))
                .andExpect(status().isOk());

        JsonNode checklistAfterUndo = json(mockMvc.perform(get("/api/v1/checklists/me")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andReturn()).get("items").get(0);
        assertThat(checklistAfterUndo.get("status").asText()).isEqualTo("PENDING");

        JsonNode planAfterUndo = json(mockMvc.perform(get("/api/v1/onboarding-plans/{id}", planId)
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andReturn());
        assertThat(planAfterUndo.get("progressPercent").asDouble()).isEqualTo(0.0);

        // Scenario D: PlanItem 완료 취소가 오늘의 추천에도 반영되는지
        JsonNode recoAfterUndo = findRecommendationForPlanItem(planItemId, null);
        String recommendationId = recoAfterUndo.get("id").asText();
        assertThat(recoAfterUndo.get("status").asText()).isEqualTo("PENDING");

        // Scenario C: 추천 완료 -> 추천 DONE -> planItem DONE -> checklist DONE -> progress 증가
        mockMvc.perform(post("/api/v1/recommendations/{id}/complete", recommendationId)
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk());

        JsonNode planAfterRecoComplete = json(mockMvc.perform(get("/api/v1/onboarding-plans/{id}", planId)
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andReturn());
        assertThat(planAfterRecoComplete.get("items").get(0).get("status").asText()).isEqualTo("DONE");
        assertThat(planAfterRecoComplete.get("progressPercent").asDouble()).isEqualTo(50.0);

        JsonNode checklistAfterRecoComplete = json(mockMvc.perform(get("/api/v1/checklists/me")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andReturn()).get("items").get(0);
        assertThat(checklistAfterRecoComplete.get("status").asText()).isEqualTo("DONE");

        // Scenario E: 그 날짜에 해당하는 planItem 이 하나도 없으면(day 15) FK 오류 없이 폴백 추천을 준다
        String noItemsDate = LocalDate.now().plusDays(14).toString();
        JsonNode fallback = json(mockMvc.perform(get("/api/v1/recommendations/today")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId)
                        .param("date", noItemsDate))
                .andExpect(status().isOk())
                .andReturn());
        assertThat(fallback.get("items")).hasSize(1);
        JsonNode fallbackItem = fallback.get("items").get(0);
        assertThat(fallbackItem.get("planItemId").isNull()).isTrue();
        assertThat(fallbackItem.get("status").asText()).isEqualTo("PENDING");
    }

    /**
     * 체크리스트가 PENDING/DONE 이외의 상태를 거부하는지 (건너뜀/제외 상태를 체크리스트로 보낼 수 없다).
     */
    @Test
    @DisplayName("체크리스트는 SKIPPED/DISMISSED 상태를 거부한다")
    void checklistRejectsNonBinaryStatus() throws Exception {
        MvcResult tpl = mockMvc.perform(post("/api/v1/templates")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"Reject Template",
                                  "targetRole":"OWNER",
                                  "isDefault":true,
                                  "items":[{"dayIndex":1,"type":"CHECKLIST","title":"확인 업무","sortOrder":0}]
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        String templateId = json(tpl).get("id").asText();

        MvcResult generated = mockMvc.perform(post("/api/v1/onboarding-plans/generate")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"templateId":"%s","force":false}
                                """.formatted(templateId)))
                .andExpect(status().isCreated())
                .andReturn();
        String planItemId = json(generated).get("items").get(0).get("id").asText();

        JsonNode checklist = json(mockMvc.perform(get("/api/v1/checklists/me")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andReturn());
        String checklistId = checklist.get("items").get(0).get("id").asText();

        mockMvc.perform(patch("/api/v1/checklists/items/{id}", checklistId)
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"SKIPPED\"}"))
                .andExpect(status().isBadRequest());

        // 계획 항목 쪽도 DISMISSED 는 거부한다 (추천 전용 상태다)
        mockMvc.perform(patch("/api/v1/onboarding-plans/items/{id}", planItemId)
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DISMISSED\"}"))
                .andExpect(status().isBadRequest());
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }

    private JsonNode findRecommendationForPlanItem(String planItemId, LocalDate date) throws Exception {
        var request = get("/api/v1/recommendations/today")
                .header("Authorization", "Bearer " + token)
                .header("X-Workspace-Id", workspaceId);
        if (date != null) request.param("date", date.toString());

        JsonNode response = json(mockMvc.perform(request).andExpect(status().isOk()).andReturn());
        for (JsonNode item : response.get("items")) {
            if (planItemId.equals(text(item, "planItemId"))) return item;
        }
        throw new AssertionError("해당 planItemId 로 연결된 추천을 찾지 못했습니다: " + planItemId);
    }
}
