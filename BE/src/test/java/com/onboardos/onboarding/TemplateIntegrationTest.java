package com.onboardos.onboarding;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onboardos.onboarding.domain.user.EmailVerificationCode;
import com.onboardos.onboarding.domain.user.EmailVerificationCodeRepository;
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
 * Docker 필요. {@code ./gradlew integrationTest} 로 실행.
 */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestcontainersConfig.class)
@ActiveProfiles("test")
class TemplateIntegrationTest {


    @Autowired
    MockMvc mockMvc;

    @Autowired
    EmailVerificationCodeRepository verificationCodeRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void createAndListTemplate() throws Exception {
        String email = "admin_" + System.currentTimeMillis() + "@example.com";
        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password1","name":"관리자"}
                                """.formatted(email)))
                .andExpect(status().isCreated());

        // Verify email
        EmailVerificationCode code = verificationCodeRepository.findByEmail(email).orElseThrow();
        mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","code":"%s"}
                                """.formatted(email, code.getCode())))
                .andExpect(status().isOk());

        // Login to get token
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password1"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn();
        String token = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .get("accessToken").asText();

        MvcResult ws = mockMvc.perform(post("/api/v1/workspaces")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"TplCo","slug":"tpl-%d"}
                                """.formatted(System.currentTimeMillis() % 100000)))
                .andExpect(status().isCreated())
                .andReturn();
        String workspaceId = objectMapper.readTree(ws.getResponse().getContentAsString()).get("id").asText();

        MvcResult created = mockMvc.perform(post("/api/v1/templates")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"Backend NEW_HIRE",
                                  "targetRole":"NEW_HIRE",
                                  "isDefault":true,
                                  "items":[
                                    {"dayIndex":1,"type":"CHECKLIST","title":"계정 발급 확인","sortOrder":0},
                                    {"dayIndex":2,"type":"PRACTICE","title":"아키텍처 문서 읽기","sortOrder":0}
                                  ]
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Backend NEW_HIRE"))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.itemCount").value(2))
                .andReturn();
        String templateId = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(get("/api/v1/templates/{id}", templateId)
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2));

        mockMvc.perform(post("/api/v1/templates")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Invalid document","targetRole":"NEW_HIRE","items":[
                                  {"dayIndex":1,"type":"DOCUMENT","title":"Missing document id"}
                                ]}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(patch("/api/v1/templates/{id}", templateId)
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"items":[
                                  {"dayIndex":3,"type":"PRACTICE","title":"Updated practice","sortOrder":2},
                                  {"dayIndex":1,"type":"CHECKLIST","title":"Updated checklist","sortOrder":0},
                                  {"dayIndex":2,"type":"PERSON","title":"Meet manager","sortOrder":1}
                                ]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemCount").value(3))
                .andExpect(jsonPath("$.items[0].title").value("Updated checklist"));

        mockMvc.perform(patch("/api/v1/templates/{id}", templateId)
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"items":[
                                  {"dayIndex":3,"type":"PRACTICE","title":"Updated practice","sortOrder":0},
                                  {"dayIndex":1,"type":"CHECKLIST","title":"Updated checklist","sortOrder":1}
                                ]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemCount").value(2));

        mockMvc.perform(patch("/api/v1/templates/{id}", templateId)
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(get("/api/v1/templates")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].itemCount").value(2))
                .andExpect(jsonPath("$.items[0].practiceCount").value(1))
                .andExpect(jsonPath("$.items[0].checklistCount").value(1));
    }
}
