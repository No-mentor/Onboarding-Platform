package com.onboardos.onboarding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
 * Docker 필요. {@code ./gradlew integrationTest} 로 실행.
 */
@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestcontainersConfig.class)
@ActiveProfiles("test")
class IdentityIntegrationTest {


    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void signup_login_createWorkspace_me() throws Exception {
        String email = "owner_" + System.currentTimeMillis() + "@example.com";

        MvcResult signup = mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"password1","name":"오너"}
                                """.formatted(email)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andReturn();

        String token = objectMapper.readTree(signup.getResponse().getContentAsString())
                .get("accessToken").asText();

        MvcResult ws = mockMvc.perform(post("/api/v1/workspaces")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Acme","slug":"acme-%d"}
                                """.formatted(System.currentTimeMillis() % 100000)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andReturn();

        String workspaceId = objectMapper.readTree(ws.getResponse().getContentAsString()).get("id").asText();

        MvcResult me = mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + token)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andReturn();

        JsonNode meJson = objectMapper.readTree(me.getResponse().getContentAsString());
        assertThat(meJson.get("currentWorkspace").get("role").asText()).isEqualTo("OWNER");
    }
}
