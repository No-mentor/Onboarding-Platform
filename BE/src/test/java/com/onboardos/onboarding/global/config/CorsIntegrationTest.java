package com.onboardos.onboarding.global.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.onboardos.onboarding.support.PostgresTestcontainersConfig;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestcontainersConfig.class)
@ActiveProfiles("test")
@TestPropertySource(properties = "app.cors.allowed-origins=http://localhost:3000, https://frontend.example.com")
class CorsIntegrationTest {
    private static final String DEPLOYED = "https://frontend.example.com";
    @Autowired MockMvc mockMvc;

    @Test void applicationContextLoadsWithCorsProperties() {}

    @Test void deployedOriginAndPreflightAreAccepted() throws Exception {
        mockMvc.perform(options("/api/v1/members")
                        .header("Origin", DEPLOYED)
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "Authorization,X-Workspace-Id"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", DEPLOYED))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
    }

    @Test void unlistedOriginIsBlockedBySecurityCorsChain() throws Exception {
        mockMvc.perform(get("/api/v1/health").header("Origin", "https://evil.example.com"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test void corsDoesNotWeakenAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/members").header("Origin", DEPLOYED)
                        .header("X-Workspace-Id", "00000000-0000-0000-0000-000000000001"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(header().string("Access-Control-Allow-Origin", DEPLOYED));
    }
}
