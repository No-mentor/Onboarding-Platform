package com.onboardos.onboarding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onboardos.onboarding.support.PostgresTestcontainersConfig;
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
 * 백엔드2 파트(Plan/Recommendations/Checklist/Template/Dashboard/Progress) 통합 검증.
 */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestcontainersConfig.class)
@ActiveProfiles("test")
class BackPart2IntegrationTest {

    @Autowired
    MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void ownerFlow_plan_recommendation_checklist_template_dashboard_progress() throws Exception {
        String ownerEmail = "owner2_" + System.currentTimeMillis() + "@example.com";
        String ownerToken = signup(ownerEmail, "오너2");
        String workspaceId = createWorkspace(ownerToken, "bp2-owner");

        MvcResult createdTemplate = mockMvc.perform(post("/api/v1/templates")
                        .header("Authorization", "Bearer " + ownerToken)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"BP2 Default Template",
                                  "targetRole":"NEW_HIRE",
                                  "isDefault":true,
                                  "items":[
                                    {"dayIndex":1,"type":"CHECKLIST","title":"계정 확인","sortOrder":0},
                                    {"dayIndex":1,"type":"PRACTICE","title":"환경 실행","sortOrder":1}
                                  ]
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andReturn();

        String templateId = objectMapper.readTree(createdTemplate.getResponse().getContentAsString())
                .get("id").asText();

        mockMvc.perform(post("/api/v1/onboarding-plans/generate")
                        .header("Authorization", "Bearer " + ownerToken)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"templateId":"%s","force":false}
                                """.formatted(templateId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.planId").isNotEmpty())
                .andExpect(jsonPath("$.items.length()").value(4));

        mockMvc.perform(get("/api/v1/onboarding-plans/me")
                        .header("Authorization", "Bearer " + ownerToken)
                        .header("X-Workspace-Id", workspaceId)
                        .param("includeItems", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0));

        MvcResult today = mockMvc.perform(get("/api/v1/recommendations/today")
                        .header("Authorization", "Bearer " + ownerToken)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andReturn();

        JsonNode todayJson = objectMapper.readTree(today.getResponse().getContentAsString());
        String recommendationId = todayJson.get("items").get(0).get("id").asText();

        mockMvc.perform(post("/api/v1/recommendations/{id}/complete", recommendationId)
                        .header("Authorization", "Bearer " + ownerToken)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DONE"));

        mockMvc.perform(get("/api/v1/checklists/me")
                        .header("Authorization", "Bearer " + ownerToken)
                        .header("X-Workspace-Id", workspaceId)
                        .param("status", "DONE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.done").value(1));

        mockMvc.perform(get("/api/v1/dashboard/me")
                        .header("Authorization", "Bearer " + ownerToken)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.today.total").isNumber())
                .andExpect(jsonPath("$.checklist.total").isNumber());

        MvcResult myProgress = mockMvc.perform(get("/api/v1/progress/me")
                        .header("Authorization", "Bearer " + ownerToken)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.progressPercent").isNumber())
                .andReturn();

        double progressPercent = objectMapper.readTree(myProgress.getResponse().getContentAsString())
                .get("progressPercent").asDouble();
        assertThat(progressPercent).isGreaterThan(0.0);
    }

    @Test
    void admin_progress_pagination_and_detail_for_new_hire() throws Exception {
        String ownerEmail = "owner3_" + System.currentTimeMillis() + "@example.com";
        String ownerToken = signup(ownerEmail, "오너3");
        String workspaceId = createWorkspace(ownerToken, "bp2-admin");

        String hireEmail = "newhire_" + System.currentTimeMillis() + "@example.com";
        String hireToken = signup(hireEmail, "신입");

        MvcResult invited = mockMvc.perform(post("/api/v1/members/invitations")
                        .header("Authorization", "Bearer " + ownerToken)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email":"%s",
                                  "role":"NEW_HIRE",
                                  "department":"Engineering",
                                  "careerLevel":"JUNIOR",
                                  "title":"Backend"
                                }
                                """.formatted(hireEmail)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn();

        String inviteToken = objectMapper.readTree(invited.getResponse().getContentAsString())
                .get("token").asText();

        MvcResult accepted = mockMvc.perform(post("/api/v1/members/invitations/{token}/accept", inviteToken)
                        .header("Authorization", "Bearer " + hireToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.workspaceId").value(workspaceId))
                .andReturn();

        assertThat(accepted.getResponse().getContentAsString()).contains(workspaceId);

        MvcResult me = mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + hireToken)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andReturn();

        String newHireUserId = objectMapper.readTree(me.getResponse().getContentAsString())
                .get("id").asText();

        mockMvc.perform(post("/api/v1/onboarding-plans/generate")
                        .header("Authorization", "Bearer " + ownerToken)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userId":"%s","force":false}
                                """.formatted(newHireUserId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.planId").isNotEmpty());

        mockMvc.perform(get("/api/v1/admin/progress")
                        .header("Authorization", "Bearer " + ownerToken)
                        .header("X-Workspace-Id", workspaceId)
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.totalElements").value(1));

        mockMvc.perform(get("/api/v1/admin/progress/{userId}", newHireUserId)
                        .header("Authorization", "Bearer " + ownerToken)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(newHireUserId))
                .andExpect(jsonPath("$.planId").isNotEmpty())
                .andExpect(jsonPath("$.insights").isString());
    }

    private String signup(String email, String name) throws Exception {
        MvcResult signup = mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password1","name":"%s"}
                                """.formatted(email, name)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(signup.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private String createWorkspace(String token, String slugPrefix) throws Exception {
        MvcResult ws = mockMvc.perform(post("/api/v1/workspaces")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"BP2 Corp","slug":"%s-%d"}
                                """.formatted(slugPrefix, System.currentTimeMillis() % 1000000)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(ws.getResponse().getContentAsString()).get("id").asText();
    }
}
