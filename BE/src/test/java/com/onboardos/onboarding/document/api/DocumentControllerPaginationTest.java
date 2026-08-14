package com.onboardos.onboarding.document.api;

import com.onboardos.onboarding.document.service.DocumentService;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.onboardos.onboarding.document.api.dto.DocumentPageResponse;
import com.onboardos.onboarding.global.exception.GlobalExceptionHandler;
import com.onboardos.onboarding.global.security.UserPrincipal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class DocumentControllerPaginationTest {
    private final DocumentService service = mock(DocumentService.class);
    private final UUID workspaceId = UUID.randomUUID();
    private final UserPrincipal principal = new UserPrincipal(UUID.randomUUID(), "user@example.com", "hash", true);
    private MockMvc mockMvc;

    @BeforeEach void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new DocumentController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        SecurityContextHolder.getContext().setAuthentication(authenticationToken());
    }

    @AfterEach void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test void omittedParametersUseDefaultPageAndSize() throws Exception {
        when(service.list(principal, workspaceId, 0, 20, null))
                .thenReturn(new DocumentPageResponse(List.of(), 0, 20, 0, 0));
        mockMvc.perform(get("/api/v1/documents")
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(0))
                .andExpect(jsonPath("$.totalPages").value(0));
        verify(service).list(principal, workspaceId, 0, 20, null);
    }

    @Test void unknownStatusReturnsValidationError() throws Exception {
        mockMvc.perform(get("/api/v1/documents")
                        .header("X-Workspace-Id", workspaceId)
                        .param("status", "UNKNOWN"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    private UsernamePasswordAuthenticationToken authenticationToken() {
        return new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    }
}
