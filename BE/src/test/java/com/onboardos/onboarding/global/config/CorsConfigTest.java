package com.onboardos.onboarding.global.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.onboardos.onboarding.global.web.HealthController;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.filter.CorsFilter;

class CorsConfigTest {
    private static final String LOCALHOST = "http://localhost:3000";
    private static final String DEPLOYED = "https://frontend.example.com";
    private MockMvc mockMvc;

    @BeforeEach void setUp() {
        CorsConfig config = new CorsConfig(new CorsProperties(String.join(",", LOCALHOST,
                "http://127.0.0.1:3000", DEPLOYED)));
        mockMvc = MockMvcBuilders.standaloneSetup(new HealthController())
                .addFilters(new CorsFilter(config.corsConfigurationSource()))
                .build();
    }

    @Test void defaultLocalhostOriginIsAllowedWithCredentials() throws Exception {
        mockMvc.perform(get("/api/v1/health").header("Origin", LOCALHOST))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", LOCALHOST))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
    }

    @Test void configuredDeploymentOriginIsAllowedExactly() throws Exception {
        mockMvc.perform(get("/api/v1/health").header("Origin", DEPLOYED))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", DEPLOYED));
    }

    @Test void unlistedOriginIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/health").header("Origin", "https://evil.example.com"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test void optionsPreflightReturnsExistingMethodsHeadersAndCredentials() throws Exception {
        mockMvc.perform(options("/api/v1/health")
                        .header("Origin", DEPLOYED)
                        .header("Access-Control-Request-Method", "PATCH")
                        .header("Access-Control-Request-Headers", "Authorization,X-Workspace-Id"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", DEPLOYED))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"))
                .andExpect(header().string("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS"))
                .andExpect(header().string("Access-Control-Allow-Headers",
                        org.hamcrest.Matchers.containsStringIgnoringCase("Authorization")));
    }

    @Test void existingExposedHeadersRemainConfigured() {
        org.assertj.core.api.Assertions.assertThat(new CorsConfig(new CorsProperties(LOCALHOST))
                        .corsConfigurationSource().getCorsConfiguration(new org.springframework.mock.web.MockHttpServletRequest())
                        .getExposedHeaders())
                .isEqualTo(List.of("Authorization", "X-Workspace-Id"));
    }
}
