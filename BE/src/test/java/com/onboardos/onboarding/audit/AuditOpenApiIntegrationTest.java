package com.onboardos.onboarding.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestcontainersConfig.class)
@ActiveProfiles("test")
class AuditOpenApiIntegrationTest {
    @Autowired MockMvc mockMvc;

    @Test void apiDocsDeclareIntegerPageAndSizeSchemas() throws Exception {
        String content = mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode parameters = new ObjectMapper().readTree(content)
                .path("paths").path("/api/v1/admin/audit-logs").path("get").path("parameters");

        JsonNode page = parameter(parameters, "page").path("schema");
        assertThat(page.path("type").asText()).isEqualTo("integer");
        assertThat(page.path("format").asText()).isEqualTo("int32");
        assertThat(page.path("default").asInt()).isZero();
        assertThat(page.path("minimum").asInt()).isZero();

        JsonNode size = parameter(parameters, "size").path("schema");
        assertThat(size.path("type").asText()).isEqualTo("integer");
        assertThat(size.path("format").asText()).isEqualTo("int32");
        assertThat(size.path("default").asInt()).isEqualTo(50);
        assertThat(size.path("minimum").asInt()).isEqualTo(1);
        assertThat(size.path("maximum").asInt()).isEqualTo(100);
    }

    private JsonNode parameter(JsonNode parameters, String name) {
        for (JsonNode parameter : parameters) {
            if (name.equals(parameter.path("name").asText())) {
                return parameter;
            }
        }
        throw new AssertionError("Missing OpenAPI parameter: " + name);
    }
}
