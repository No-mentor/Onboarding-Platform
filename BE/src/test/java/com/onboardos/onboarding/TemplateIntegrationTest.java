package com.onboardos.onboarding;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
    ObjectMapper objectMapper;

    @Test
    void createAndListTemplate() throws Exception {
        String email = "admin_" + System.currentTimeMillis() + "@example.com";
        MvcResult signup = mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password1","name":"관리자"}
                                """.formatted(email)))
                .andExpect(status().isCreated())
                .andReturn();
        String token = objectMapper.readTree(signup.getResponse().getContentAsString())
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

        mockMvc.perform(post("/api/v1/templates")
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
                                    {"dayIndex":2,"type":"DOCUMENT","title":"아키텍처 문서 읽기","sortOrder":0}
                                  ]
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Backend NEW_HIRE"))
                .andExpect(jsonPath("$.items.length()").value(2));

        mockMvc.perform(get("/api/v1/templates")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1));
    }
}
