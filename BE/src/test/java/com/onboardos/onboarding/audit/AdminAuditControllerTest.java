package com.onboardos.onboarding.audit;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.onboardos.onboarding.audit.dto.AuditLogPageResponse;
import com.onboardos.onboarding.audit.dto.AuditLogResponse;
import com.onboardos.onboarding.global.exception.GlobalExceptionHandler;
import com.onboardos.onboarding.global.security.UserPrincipal;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import java.lang.reflect.Method;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class AdminAuditControllerTest {
    private final AuditService service = mock(AuditService.class);
    private final UUID workspaceId = UUID.randomUUID();
    private final UserPrincipal principal = new UserPrincipal(UUID.randomUUID(), "admin@example.com", "hash", true);
    private MockMvc mockMvc;

    @BeforeEach void setUp() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        mockMvc = MockMvcBuilders.standaloneSetup(new AdminAuditController(service))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @AfterEach void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test void omittedParametersUsePageZeroAndSizeFiftyAndReturnDtoOnly() throws Exception {
        AuditLogResponse item = new AuditLogResponse(UUID.randomUUID(), "DOC_ACCESS_DENIED", UUID.randomUUID(),
                "DOCUMENT", UUID.randomUUID(), "DENIED", Map.of("reason", "role"),
                Instant.parse("2026-08-11T12:00:00Z"));
        when(service.list(workspaceId, principal.getId(), 0, 50, null, null, null, null))
                .thenReturn(new AuditLogPageResponse(List.of(item), 0, 50, 1, 1));

        mockMvc.perform(get("/api/v1/admin/audit-logs").header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(50))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.items[0].eventType").value("DOC_ACCESS_DENIED"))
                .andExpect(jsonPath("$.items[0].message").doesNotExist())
                .andExpect(jsonPath("$.items[0].workspaceId").doesNotExist());
        verify(service).list(workspaceId, principal.getId(), 0, 50, null, null, null, null);
    }

    @Test void malformedActorIdAndDatetimeReturnValidationError() throws Exception {
        mockMvc.perform(get("/api/v1/admin/audit-logs").header("X-Workspace-Id", workspaceId)
                        .param("actorId", "not-a-uuid"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mockMvc.perform(get("/api/v1/admin/audit-logs").header("X-Workspace-Id", workspaceId)
                        .param("from", "not-a-date"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test void malformedWorkspaceUuidUsesSafeValidationResponse() throws Exception {
        mockMvc.perform(get("/api/v1/admin/audit-logs").header("X-Workspace-Id", "not-a-uuid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test void swaggerDeclaresAllExpectedResponses() throws Exception {
        Method method = AdminAuditController.class.getMethod("list", UUID.class, int.class, int.class,
                String.class, String.class, String.class, String.class);
        Set<String> codes = Arrays.stream(method.getAnnotation(ApiResponses.class).value())
                .map(response -> response.responseCode()).collect(Collectors.toSet());
        org.assertj.core.api.Assertions.assertThat(codes).containsExactlyInAnyOrder("200", "400", "401", "403");
    }
}
