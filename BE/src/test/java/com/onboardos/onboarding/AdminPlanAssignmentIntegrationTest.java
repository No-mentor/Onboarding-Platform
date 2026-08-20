package com.onboardos.onboarding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.MembershipRepository;
import com.onboardos.onboarding.domain.user.User;
import com.onboardos.onboarding.domain.user.UserRepository;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.domain.workspace.Workspace;
import com.onboardos.onboarding.domain.workspace.WorkspaceRepository;
import com.onboardos.onboarding.global.security.JwtTokenProvider;
import com.onboardos.onboarding.support.PostgresTestcontainersConfig;
import java.util.List;
import java.util.UUID;
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
 * 관리자가 템플릿을 특정 인턴(NEW_HIRE)에게 적용하는 전체 흐름을 검증한다:
 * 템플릿 생성 → 대상 인턴 선택(userId) → 계획 생성/재생성 → 그 인턴의 plan/checklist/recommendation
 * 만 바뀌고 관리자 자신의 plan 은 영향받지 않는지.
 *
 * Docker 필요. {@code ./gradlew integrationTest} 로 실행.
 */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestcontainersConfig.class)
@ActiveProfiles("test")
class AdminPlanAssignmentIntegrationTest {

    @Autowired
    MockMvc mockMvc;
    @Autowired
    UserRepository users;
    @Autowired
    MembershipRepository memberships;
    @Autowired
    WorkspaceRepository workspaces;
    @Autowired
    JwtTokenProvider tokens;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("관리자가 특정 인턴에게 템플릿을 적용하면 그 인턴의 plan/checklist/오늘 할 일만 바뀌고, 관리자 자신의 plan 은 그대로다")
    void adminAssignsTemplateToSpecificInternWithoutTouchingOwnPlan() throws Exception {
        Workspace workspace = workspaces.save(Workspace.create("Assign Co", "assign-" + shortId()));
        Membership ownerMembership = addMember(workspace, UserRole.OWNER);
        Membership internMembership = addMember(workspace, UserRole.NEW_HIRE);
        String ownerToken = bearer(ownerMembership);
        String internToken = bearer(internMembership);
        String workspaceId = workspace.getId().toString();
        String internUserId = internMembership.getUserId().toString();

        // 관리자 자신의 계획을 먼저 하나 만들어 둔다 (다른 사람 계획을 건드릴 때 이게 안 바뀌는지 확인용)
        String ownerTemplateId = createTemplate(ownerToken, workspaceId, "Owner Self Template", "OWNER", """
                [{"dayIndex":1,"type":"PRACTICE","title":"오너 전용 업무","sortOrder":0}]
                """);
        mockMvc.perform(post("/api/v1/onboarding-plans/generate")
                        .header("Authorization", "Bearer " + ownerToken)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"templateId":"%s","force":false}
                                """.formatted(ownerTemplateId)))
                .andExpect(status().isCreated());
        JsonNode ownerPlan = json(mockMvc.perform(get("/api/v1/onboarding-plans/me")
                        .header("Authorization", "Bearer " + ownerToken)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andReturn());
        String ownerPlanId = ownerPlan.get("planId").asText();

        // Scenario A: NEW_HIRE 대상 템플릿 T 생성 (Day1 CHECKLIST + PERSON, Day2 PRACTICE)
        String templateId = createTemplate(ownerToken, workspaceId, "Intern Onboarding T", "NEW_HIRE", """
                [
                  {"dayIndex":1,"type":"CHECKLIST","title":"계정 설정","sortOrder":0},
                  {"dayIndex":1,"type":"PERSON","title":"멘토 미팅","sortOrder":1},
                  {"dayIndex":2,"type":"PRACTICE","title":"첫 업무","sortOrder":0}
                ]
                """);

        // 관리자가 인턴을 대상으로(userId 지정) 첫 계획을 생성한다 — 아직 인턴은 plan 이 없는 상태
        MvcResult generated = mockMvc.perform(post("/api/v1/onboarding-plans/generate")
                        .header("Authorization", "Bearer " + ownerToken)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"templateId":"%s","userId":"%s","force":false}
                                """.formatted(templateId, internUserId)))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode internPlan = json(generated);
        assertThat(internPlan.get("userId").asText()).isEqualTo(internUserId);
        assertThat(internPlan.get("items")).hasSize(3);
        String internPlanId = internPlan.get("planId").asText();

        // 관리자 자신의 계획은 영향받지 않는다 (Scenario C)
        JsonNode ownerPlanAfterInternGenerate = json(mockMvc.perform(get("/api/v1/onboarding-plans/{id}", ownerPlanId)
                        .header("Authorization", "Bearer " + ownerToken)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andReturn());
        assertThat(ownerPlanAfterInternGenerate.get("items").get(0).get("title").asText()).isEqualTo("오너 전용 업무");
        assertThat(ownerPlanAfterInternGenerate.get("version").asInt()).isEqualTo(1);

        // 인턴 본인 로그인 기준으로도 자기 계획이 그대로 보인다
        JsonNode internOwnPlanView = json(mockMvc.perform(get("/api/v1/onboarding-plans/me")
                        .header("Authorization", "Bearer " + internToken)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andReturn());
        assertThat(internOwnPlanView.get("items")).hasSize(3);

        // 체크리스트: CHECKLIST 타입 1개만 생성됨
        JsonNode internChecklist = json(mockMvc.perform(get("/api/v1/checklists/me")
                        .header("Authorization", "Bearer " + internToken)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andReturn());
        assertThat(internChecklist.get("items")).hasSize(1);
        assertThat(internChecklist.get("items").get(0).get("title").asText()).isEqualTo("계정 설정");

        // 오늘(Day1) 할 일: 체크리스트 + 멘토 미팅 2건
        JsonNode internToday = json(mockMvc.perform(get("/api/v1/recommendations/today")
                        .header("Authorization", "Bearer " + internToken)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andReturn());
        assertThat(internToday.get("items")).hasSize(2);

        // Scenario B: 템플릿이 바뀐 뒤 관리자가 같은 인턴의 계획을 재생성한다
        String newTemplateId = createTemplate(ownerToken, workspaceId, "Intern Onboarding T v2", "NEW_HIRE", """
                [{"dayIndex":1,"type":"CHECKLIST","title":"보안 교육","sortOrder":0}]
                """);
        mockMvc.perform(post("/api/v1/onboarding-plans/{id}/regenerate", internPlanId)
                        .header("Authorization", "Bearer " + ownerToken)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"templateId":"%s","preserveCompleted":false}
                                """.formatted(newTemplateId)))
                .andExpect(status().isOk());

        JsonNode internPlanAfterRegen = json(mockMvc.perform(get("/api/v1/onboarding-plans/me")
                        .header("Authorization", "Bearer " + internToken)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andReturn());
        assertThat(internPlanAfterRegen.get("items")).hasSize(1);
        assertThat(internPlanAfterRegen.get("items").get(0).get("title").asText()).isEqualTo("보안 교육");

        JsonNode internChecklistAfterRegen = json(mockMvc.perform(get("/api/v1/checklists/me")
                        .header("Authorization", "Bearer " + internToken)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andReturn());
        assertThat(internChecklistAfterRegen.get("items")).hasSize(1);
        assertThat(internChecklistAfterRegen.get("items").get(0).get("title").asText()).isEqualTo("보안 교육");

        JsonNode internTodayAfterRegen = json(mockMvc.perform(get("/api/v1/recommendations/today")
                        .header("Authorization", "Bearer " + internToken)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andReturn());
        assertThat(internTodayAfterRegen.get("items")).hasSize(1);
        assertThat(internTodayAfterRegen.get("items").get(0).get("title").asText()).isEqualTo("보안 교육");

        // 관리자 자신의 계획은 이번에도 그대로다
        JsonNode ownerPlanFinal = json(mockMvc.perform(get("/api/v1/onboarding-plans/{id}", ownerPlanId)
                        .header("Authorization", "Bearer " + ownerToken)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andReturn());
        assertThat(ownerPlanFinal.get("version").asInt()).isEqualTo(1);
    }

    @Test
    @DisplayName("MANAGER 도 인턴 계획을 생성/재생성할 수 있다 (FE 가 재생성 버튼을 보여주는 권한과 BE 가 실제로 허용하는 권한이 일치해야 한다)")
    void managerCanGenerateAndRegenerateInternPlan() throws Exception {
        Workspace workspace = workspaces.save(Workspace.create("Manager Co", "mgr-" + shortId()));
        Membership ownerMembership = addMember(workspace, UserRole.OWNER);
        Membership managerMembership = addMember(workspace, UserRole.MANAGER);
        Membership internMembership = addMember(workspace, UserRole.NEW_HIRE);
        String ownerToken = bearer(ownerMembership);
        String managerToken = bearer(managerMembership);
        String workspaceId = workspace.getId().toString();
        String internUserId = internMembership.getUserId().toString();

        // 템플릿 생성/수정은 여전히 OWNER/ADMIN 전용이다 (MANAGER 는 계획 생성/재생성만 할 수 있다).
        // 여기서는 OWNER 가 템플릿을 만들고, MANAGER 가 그 템플릿으로 인턴 계획을 생성/재생성한다.
        String templateId = createTemplate(ownerToken, workspaceId, "Manager Assigned Template", "NEW_HIRE", """
                [{"dayIndex":1,"type":"CHECKLIST","title":"오리엔테이션","sortOrder":0}]
                """);

        MvcResult generated = mockMvc.perform(post("/api/v1/onboarding-plans/generate")
                        .header("Authorization", "Bearer " + managerToken)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"templateId":"%s","userId":"%s","force":false}
                                """.formatted(templateId, internUserId)))
                .andExpect(status().isCreated())
                .andReturn();
        String internPlanId = json(generated).get("planId").asText();

        mockMvc.perform(post("/api/v1/onboarding-plans/{id}/regenerate", internPlanId)
                        .header("Authorization", "Bearer " + managerToken)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"preserveCompleted\":true}"))
                .andExpect(status().isOk());
    }

    // --- helpers ---

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String createTemplate(
            String token, String workspaceId, String name, String targetRole, String itemsJson
    ) throws Exception {
        MvcResult created = mockMvc.perform(post("/api/v1/templates")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","targetRole":"%s","isDefault":true,"items":%s}
                                """.formatted(name, targetRole, itemsJson)))
                .andExpect(status().isCreated())
                .andReturn();
        return json(created).get("id").asText();
    }

    private Membership addMember(Workspace workspace, UserRole role) {
        User user = users.save(User.create(
                role.name().toLowerCase() + "-" + UUID.randomUUID() + "@example.com", role.name(), "hash"));
        return memberships.save(Membership.create(workspace.getId(), user.getId(), role, null, null, null));
    }

    private String bearer(Membership membership) {
        User user = users.findById(membership.getUserId()).orElseThrow();
        return tokens.createAccessToken(user.getId(), user.getEmail(), List.of("ROLE_USER"));
    }

    private String shortId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
}
