package com.onboardos.onboarding.document;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.onboardos.onboarding.global.exception.GlobalExceptionHandler;
import com.onboardos.onboarding.global.security.UserPrincipal;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class DocumentDeleteControllerTest {
    private final DocumentService service = mock(DocumentService.class);
    private final UserPrincipal principal = new UserPrincipal(UUID.randomUUID(), "user@example.com", "hash", true);
    private MockMvc mockMvc;

    @BeforeEach void setUp() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        mockMvc = MockMvcBuilders.standaloneSetup(new DocumentController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @AfterEach void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test void successfulDeleteReturnsNoContent() throws Exception {
        UUID workspaceId = UUID.randomUUID();
        UUID documentId = UUID.randomUUID();

        mockMvc.perform(delete("/api/v1/documents/{documentId}", documentId)
                        .header("X-Workspace-Id", workspaceId))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        verify(service).delete(principal, workspaceId, documentId);
    }
}
