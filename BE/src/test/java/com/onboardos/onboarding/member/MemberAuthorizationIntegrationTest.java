package com.onboardos.onboarding.member;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.MembershipRepository;
import com.onboardos.onboarding.domain.user.MembershipStatus;
import com.onboardos.onboarding.domain.user.User;
import com.onboardos.onboarding.domain.user.UserRepository;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.domain.workspace.Workspace;
import com.onboardos.onboarding.domain.workspace.WorkspaceRepository;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.mail.MailService;
import com.onboardos.onboarding.global.security.JwtTokenProvider;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.member.dto.UpdateMemberRequest;
import com.onboardos.onboarding.support.PostgresTestcontainersConfig;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@Tag("integration")
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestcontainersConfig.class)
@ActiveProfiles("test")
class MemberAuthorizationIntegrationTest {
    @Autowired MemberService service;
    @Autowired MembershipRepository memberships;
    @Autowired UserRepository users;
    @Autowired WorkspaceRepository workspaces;
    @Autowired JwtTokenProvider tokens;
    @Autowired MockMvc mockMvc;
    @MockitoBean MailService mailService;

    @Test void ownerUpdatePersistsAndAdminOwnerPromotionDoesNot() throws Exception {
        Fixture f = fixture();
        Membership member = add(f.workspace(), UserRole.MEMBER);
        service.update(principal(f.owner()), f.workspace().getId(), member.getId(), new UpdateMemberRequest(UserRole.ADMIN, null));
        assertThat(memberships.findById(member.getId()).orElseThrow().getRole()).isEqualTo(UserRole.ADMIN);

        mockMvc.perform(patch("/api/v1/members/{id}", member.getId())
                        .header("Authorization", bearer(f.admin())).header("X-Workspace-Id", f.workspace().getId())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"OWNER\"}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        assertThat(memberships.findById(member.getId()).orElseThrow().getRole()).isEqualTo(UserRole.ADMIN);
    }

    @Test void adminOwnerInvitationAndOwnerTargetChangesReturnSafe403() throws Exception {
        Fixture f = fixture();
        mockMvc.perform(post("/api/v1/members/invitations")
                        .header("Authorization", bearer(f.admin())).header("X-Workspace-Id", f.workspace().getId())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"blocked@example.com\",\"role\":\"OWNER\"}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.message").value(ErrorCode.FORBIDDEN.getDefaultMessage()));
        mockMvc.perform(patch("/api/v1/members/{id}", f.owner().getId())
                        .header("Authorization", bearer(f.admin())).header("X-Workspace-Id", f.workspace().getId())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"DISABLED\"}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.message").value(ErrorCode.FORBIDDEN.getDefaultMessage()));
        assertThat(memberships.findById(f.owner().getId()).orElseThrow().getStatus()).isEqualTo(MembershipStatus.ACTIVE);
    }

    @Test void unauthenticatedRequestIs401AndHeadersKeepExistingErrors() throws Exception {
        mockMvc.perform(post("/api/v1/members/invitations").header("X-Workspace-Id", UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"x@example.com\"}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        Fixture f = fixture();
        mockMvc.perform(post("/api/v1/members/invitations").header("Authorization", bearer(f.owner()))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"x@example.com\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mockMvc.perform(post("/api/v1/members/invitations").header("Authorization", bearer(f.owner()))
                        .header("X-Workspace-Id", "invalid").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"x@example.com\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test void lastOwnerAndWorkspaceIsolationLeaveDatabaseUnchanged() {
        Fixture f = fixture();
        Workspace other = workspaces.save(Workspace.create("Other", "other-" + shortId()));
        Membership outsider = add(other, UserRole.MEMBER);
        assertThatThrownBy(() -> service.update(principal(f.owner()), f.workspace().getId(), f.owner().getId(),
                new UpdateMemberRequest(UserRole.ADMIN, MembershipStatus.DISABLED))).isInstanceOf(BusinessException.class);
        Membership ownerAfter = memberships.findById(f.owner().getId()).orElseThrow();
        assertThat(ownerAfter.getRole()).isEqualTo(UserRole.OWNER);
        assertThat(ownerAfter.getStatus()).isEqualTo(MembershipStatus.ACTIVE);
        assertThatThrownBy(() -> service.update(principal(f.owner()), f.workspace().getId(), outsider.getId(),
                new UpdateMemberRequest(UserRole.ADMIN, null))).isInstanceOfSatisfying(BusinessException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
        assertThat(memberships.findById(outsider.getId()).orElseThrow().getRole()).isEqualTo(UserRole.MEMBER);
    }

    @Test void concurrentOwnerDemotionsKeepAtLeastOneActiveOwner() throws Exception {
        Fixture f = fixture();
        Membership secondOwner = add(f.workspace(), UserRole.OWNER);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<Boolean> first = executor.submit(() -> demoteAfter(start, f.workspace().getId(), f.owner()));
            Future<Boolean> second = executor.submit(() -> demoteAfter(start, f.workspace().getId(), secondOwner));
            start.countDown();
            assertThat(List.of(first.get(), second.get())).containsExactlyInAnyOrder(true, false);
        } finally {
            executor.shutdownNow();
        }
        assertThat(memberships.countByWorkspaceIdAndRoleAndStatusAndDeletedAtIsNull(
                f.workspace().getId(), UserRole.OWNER, MembershipStatus.ACTIVE)).isEqualTo(1);
    }

    private boolean demoteAfter(CountDownLatch start, UUID workspaceId, Membership actor) throws Exception {
        start.await();
        try {
            service.update(principal(actor), workspaceId, actor.getId(), new UpdateMemberRequest(UserRole.ADMIN, null));
            return true;
        } catch (BusinessException ex) {
            assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.CONFLICT);
            return false;
        }
    }

    private Fixture fixture() {
        Workspace workspace = workspaces.save(Workspace.create("Issue 94", "issue-94-" + shortId()));
        Membership owner = add(workspace, UserRole.OWNER);
        Membership admin = add(workspace, UserRole.ADMIN);
        return new Fixture(workspace, owner, admin);
    }
    private Membership add(Workspace workspace, UserRole role) {
        User user = users.save(User.create(role.name().toLowerCase() + "-" + UUID.randomUUID() + "@example.com", role.name(), "hash"));
        return memberships.save(Membership.create(workspace.getId(), user.getId(), role, null, null, null));
    }
    private UserPrincipal principal(Membership membership) {
        User user = users.findById(membership.getUserId()).orElseThrow();
        return new UserPrincipal(user.getId(), user.getEmail(), user.getPasswordHash(), true);
    }
    private String bearer(Membership membership) {
        User user = users.findById(membership.getUserId()).orElseThrow();
        return "Bearer " + tokens.createAccessToken(user.getId(), user.getEmail(), List.of("ROLE_USER"));
    }
    private String shortId() { return UUID.randomUUID().toString().substring(0, 8); }
    private record Fixture(Workspace workspace, Membership owner, Membership admin) {}
}
