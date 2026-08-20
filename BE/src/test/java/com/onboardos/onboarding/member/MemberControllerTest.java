package com.onboardos.onboarding.member;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.onboardos.onboarding.domain.invitation.InvitationStatus;
import com.onboardos.onboarding.domain.user.MembershipStatus;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.exception.GlobalExceptionHandler;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.member.dto.InvitationResponse;
import com.onboardos.onboarding.member.dto.MemberResponse;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class MemberControllerTest {
    private final MemberService service = mock(MemberService.class);
    private final UserPrincipal principal = new UserPrincipal(UUID.randomUUID(), "owner@example.com", "hash", true);
    private final UUID workspaceId = UUID.randomUUID();
    private MockMvc mockMvc;

    @BeforeEach void setUp() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        mockMvc = MockMvcBuilders.standaloneSetup(new MemberController(service))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @AfterEach void tearDown() { SecurityContextHolder.clearContext(); }

    @Test void ownerInvitationRequestKeepsContract() throws Exception {
        UUID invitationId = UUID.randomUUID();
        when(service.invite(any(), any(), any())).thenReturn(new InvitationResponse(
                invitationId, "new@example.com", UserRole.OWNER, "token", Instant.now(), InvitationStatus.PENDING));
        mockMvc.perform(post("/api/v1/members/invitations").header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"new@example.com\",\"role\":\"OWNER\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.invitationId").value(invitationId.toString()))
                .andExpect(jsonPath("$.role").value("OWNER"));
    }

    @Test void ownerUpdateRequestKeepsContract() throws Exception {
        UUID memberId = UUID.randomUUID();
        when(service.update(any(), any(), any(), any())).thenReturn(new MemberResponse(
                memberId, UUID.randomUUID(), "name", "user@example.com", UserRole.OWNER,
                MembershipStatus.ACTIVE, null, null, null));
        mockMvc.perform(patch("/api/v1/members/{id}", memberId).header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"OWNER\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(memberId.toString()))
                .andExpect(jsonPath("$.role").value("OWNER"));
    }

    @Test void forbiddenResponseKeepsSafeErrorContract() throws Exception {
        when(service.update(any(), any(), any(), any())).thenThrow(new BusinessException(ErrorCode.FORBIDDEN));
        mockMvc.perform(patch("/api/v1/members/{id}", UUID.randomUUID()).header("X-Workspace-Id", workspaceId)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"OWNER\"}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.timestamp").exists()).andExpect(jsonPath("$.traceId").exists())
                .andExpect(jsonPath("$.message").value(ErrorCode.FORBIDDEN.getDefaultMessage()))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Membership"))));
    }

    @Test void missingOrMalformedWorkspaceHeaderUsesExistingHandling() throws Exception {
        mockMvc.perform(post("/api/v1/members/invitations").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"new@example.com\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/members/invitations").header("X-Workspace-Id", "bad")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"new@example.com\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
}
