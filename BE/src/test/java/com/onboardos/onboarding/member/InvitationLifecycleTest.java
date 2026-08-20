package com.onboardos.onboarding.member;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.onboardos.onboarding.domain.invitation.Invitation;
import com.onboardos.onboarding.domain.invitation.InvitationRepository;
import com.onboardos.onboarding.domain.invitation.InvitationStatus;
import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.MembershipRepository;
import com.onboardos.onboarding.domain.user.User;
import com.onboardos.onboarding.domain.user.UserRepository;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.domain.workspace.Workspace;
import com.onboardos.onboarding.domain.workspace.WorkspaceRepository;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.mail.MailService;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import com.onboardos.onboarding.member.dto.CreateInvitationRequest;
import com.onboardos.onboarding.member.dto.InvitationListItemResponse;
import com.onboardos.onboarding.member.dto.InvitationPreviewResponse;
import com.onboardos.onboarding.onboarding.OnboardingPlanService;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

/** 초대 목록·취소·재발송·미리보기 등 수락 이후가 아닌 초대 자체의 생애주기 */
class InvitationLifecycleTest {

    private final InvitationRepository invitations = mock(InvitationRepository.class);
    private final MembershipRepository memberships = mock(MembershipRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final WorkspaceRepository workspaces = mock(WorkspaceRepository.class);
    private final WorkspaceAccessService access = mock(WorkspaceAccessService.class);
    private final OnboardingPlanService plans = mock(OnboardingPlanService.class);
    private final MailService mail = mock(MailService.class);
    private final MemberService service = new MemberService(invitations, memberships, users, workspaces,
            access, new MemberManagementPolicy(), plans, mail);

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID actorId = UUID.randomUUID();
    private final UserPrincipal principal = new UserPrincipal(actorId, "owner@example.com", "hash", true);

    // ---------- helpers ----------

    /** 초대·취소·재발송이 요구하는 권한 (OWNER/ADMIN) */
    private void actorCanManageInvitations() {
        when(access.requireRoles(workspaceId, actorId, UserRole.OWNER, UserRole.ADMIN))
                .thenReturn(Membership.create(workspaceId, actorId, UserRole.OWNER, null, null, null));
    }

    /** 목록 조회가 요구하는 권한 (멤버 목록과 동일) */
    private void actorCanReadWorkspace() {
        when(access.requireRoles(workspaceId, actorId, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER))
                .thenReturn(Membership.create(workspaceId, actorId, UserRole.MANAGER, null, null, null));
    }

    private Invitation invitation(UUID owningWorkspaceId, Instant expiresAt) {
        return Invitation.create(owningWorkspaceId, "invitee@example.com", UserRole.NEW_HIRE,
                "Platform", "JUNIOR", "Engineer", actorId, expiresAt, "tok-" + UUID.randomUUID());
    }

    private Invitation pendingInvitation() {
        return invitation(workspaceId, Instant.now().plus(7, ChronoUnit.DAYS));
    }

    private void assertError(org.assertj.core.api.ThrowableAssert.ThrowingCallable action, ErrorCode code) {
        assertThatThrownBy(action)
                .isInstanceOfSatisfying(BusinessException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(code));
    }

    // ---------- 목록 ----------

    @Test
    @DisplayName("초대 목록은 토큰을 빼고 초대자 이름을 채워 돌려준다")
    void listExposesInviterNameButNeverToken() {
        actorCanReadWorkspace();
        Invitation invitation = pendingInvitation();
        when(invitations.findByWorkspaceId(eq(workspaceId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(invitation)));
        when(users.findAllById(any())).thenReturn(List.of(inviterNamed("송하성")));

        Page<InvitationListItemResponse> page =
                service.listInvitations(principal, workspaceId, null, 0, 20);

        assertThat(page.getContent()).singleElement().satisfies(item -> {
            assertThat(item.invitationId()).isEqualTo(invitation.getId());
            assertThat(item.email()).isEqualTo("invitee@example.com");
            assertThat(item.inviterName()).isEqualTo("송하성");
            assertThat(item.department()).isEqualTo("Platform");
            assertThat(item.status()).isEqualTo(InvitationStatus.PENDING);
            assertThat(item.expired()).isFalse();
        });
        // 목록 DTO 에 token 필드가 생기면 이 테스트가 깨져야 한다
        assertThat(InvitationListItemResponse.class.getRecordComponents())
                .noneMatch(component -> component.getName().equals("token"));
    }

    @Test
    @DisplayName("기한이 지난 PENDING 초대는 목록에서 만료로 표시된다")
    void listMarksStalePendingAsExpired() {
        actorCanReadWorkspace();
        when(invitations.findByWorkspaceIdAndStatus(eq(workspaceId), eq(InvitationStatus.PENDING), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(invitation(workspaceId, Instant.now().minusSeconds(60)))));
        when(users.findAllById(any())).thenReturn(List.of());

        Page<InvitationListItemResponse> page =
                service.listInvitations(principal, workspaceId, InvitationStatus.PENDING, 0, 20);

        assertThat(page.getContent()).singleElement().satisfies(item -> {
            assertThat(item.status()).isEqualTo(InvitationStatus.PENDING);
            assertThat(item.expired()).isTrue();
        });
    }

    // ---------- 재초대 ----------

    @Test
    @DisplayName("기한이 지난 PENDING 초대는 정리되고 같은 주소로 다시 초대할 수 있다")
    void stalePendingInvitationDoesNotBlockReinvite() {
        actorCanManageInvitations();
        Invitation stale = invitation(workspaceId, Instant.now().minusSeconds(60));
        when(users.findByEmailAndDeletedAtIsNull("invitee@example.com")).thenReturn(Optional.empty());
        when(invitations.findByWorkspaceIdAndEmailAndStatus(
                workspaceId, "invitee@example.com", InvitationStatus.PENDING))
                .thenReturn(Optional.of(stale));

        service.invite(principal, workspaceId,
                new CreateInvitationRequest("invitee@example.com", UserRole.NEW_HIRE, null, null, null));

        assertThat(stale.getStatus()).isEqualTo(InvitationStatus.EXPIRED);
        verify(invitations).save(any());
        verify(mail).sendInvitationEmail(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("아직 유효한 PENDING 초대가 있으면 재초대는 409 로 막힌다")
    void livePendingInvitationBlocksReinvite() {
        actorCanManageInvitations();
        Invitation live = pendingInvitation();
        when(users.findByEmailAndDeletedAtIsNull("invitee@example.com")).thenReturn(Optional.empty());
        when(invitations.findByWorkspaceIdAndEmailAndStatus(
                workspaceId, "invitee@example.com", InvitationStatus.PENDING))
                .thenReturn(Optional.of(live));

        assertError(() -> service.invite(principal, workspaceId,
                new CreateInvitationRequest("invitee@example.com", UserRole.NEW_HIRE, null, null, null)),
                ErrorCode.CONFLICT);

        assertThat(live.getStatus()).isEqualTo(InvitationStatus.PENDING);
        verify(invitations, never()).save(any());
        verify(mail, never()).sendInvitationEmail(any(), any(), any(), any(), any(), any());
    }

    // ---------- 취소 ----------

    @Test
    @DisplayName("초대를 취소하면 REVOKED 가 되어 같은 주소로 다시 초대할 수 있다")
    void revokeMarksInvitationRevoked() {
        actorCanManageInvitations();
        Invitation invitation = pendingInvitation();
        when(invitations.findById(invitation.getId())).thenReturn(Optional.of(invitation));

        service.revokeInvitation(principal, workspaceId, invitation.getId());

        assertThat(invitation.getStatus()).isEqualTo(InvitationStatus.REVOKED);
    }

    @Test
    @DisplayName("이미 수락된 초대는 취소할 수 없다")
    void acceptedInvitationCannotBeRevoked() {
        actorCanManageInvitations();
        Invitation invitation = pendingInvitation();
        invitation.markAccepted();
        when(invitations.findById(invitation.getId())).thenReturn(Optional.of(invitation));

        assertError(() -> service.revokeInvitation(principal, workspaceId, invitation.getId()),
                ErrorCode.CONFLICT);
        assertThat(invitation.getStatus()).isEqualTo(InvitationStatus.ACCEPTED);
    }

    @Test
    @DisplayName("다른 워크스페이스의 초대는 찾을 수 없는 것으로 다루고 건드리지 않는다")
    void invitationFromAnotherWorkspaceIsNotTouched() {
        actorCanManageInvitations();
        Invitation foreign = invitation(UUID.randomUUID(), Instant.now().plus(1, ChronoUnit.DAYS));
        when(invitations.findById(foreign.getId())).thenReturn(Optional.of(foreign));

        assertError(() -> service.revokeInvitation(principal, workspaceId, foreign.getId()),
                ErrorCode.RESOURCE_NOT_FOUND);
        assertError(() -> service.resendInvitation(principal, workspaceId, foreign.getId()),
                ErrorCode.RESOURCE_NOT_FOUND);

        assertThat(foreign.getStatus()).isEqualTo(InvitationStatus.PENDING);
        verify(mail, never()).sendInvitationEmail(any(), any(), any(), any(), any(), any());
    }

    // ---------- 재발송 ----------

    @Test
    @DisplayName("재발송은 토큰을 유지하고 기한만 7일 뒤로 늘린 뒤 메일을 다시 보낸다")
    void resendKeepsTokenAndExtendsExpiry() {
        actorCanManageInvitations();
        Invitation invitation = invitation(workspaceId, Instant.now().minusSeconds(60));
        String originalToken = invitation.getToken();
        Instant originalExpiry = invitation.getExpiresAt();
        when(invitations.findById(invitation.getId())).thenReturn(Optional.of(invitation));
        when(workspaces.findByIdAndDeletedAtIsNull(workspaceId))
                .thenReturn(Optional.of(Workspace.create("팀하성", "teamsong")));
        when(users.findById(actorId)).thenReturn(Optional.of(inviterNamed("송하성")));

        service.resendInvitation(principal, workspaceId, invitation.getId());

        assertThat(invitation.getToken()).isEqualTo(originalToken);
        assertThat(invitation.getExpiresAt()).isAfter(originalExpiry).isAfter(Instant.now());
        // 만료됐던 초대가 다시 살아난다
        assertThat(invitation.getStatus()).isEqualTo(InvitationStatus.PENDING);
        verify(mail).sendInvitationEmail(
                eq("invitee@example.com"), eq("팀하성"), eq("송하성"),
                eq(UserRole.NEW_HIRE), any(Instant.class), eq(originalToken));
    }

    @Test
    @DisplayName("이미 수락된 초대는 재발송할 수 없다")
    void acceptedInvitationCannotBeResent() {
        actorCanManageInvitations();
        Invitation invitation = pendingInvitation();
        invitation.markAccepted();
        when(invitations.findById(invitation.getId())).thenReturn(Optional.of(invitation));

        assertError(() -> service.resendInvitation(principal, workspaceId, invitation.getId()),
                ErrorCode.CONFLICT);
        verify(mail, never()).sendInvitationEmail(any(), any(), any(), any(), any(), any());
    }

    // ---------- 미리보기 (인증 없이 호출되는 경로) ----------

    @Test
    @DisplayName("미리보기는 수락 전에 필요한 정보만 주고 토큰은 돌려주지 않는다")
    void previewGivesContextWithoutToken() {
        Invitation invitation = pendingInvitation();
        when(invitations.findByToken(invitation.getToken())).thenReturn(Optional.of(invitation));
        when(workspaces.findByIdAndDeletedAtIsNull(workspaceId))
                .thenReturn(Optional.of(Workspace.create("팀하성", "teamsong")));
        when(users.findById(actorId)).thenReturn(Optional.of(inviterNamed("송하성")));

        InvitationPreviewResponse preview = service.preview(invitation.getToken());

        assertThat(preview.email()).isEqualTo("invitee@example.com");
        assertThat(preview.workspaceName()).isEqualTo("팀하성");
        assertThat(preview.inviterName()).isEqualTo("송하성");
        assertThat(preview.acceptable()).isTrue();
        assertThat(preview.acceptBlockedReason()).isNull();
        assertThat(InvitationPreviewResponse.class.getRecordComponents())
                .noneMatch(component -> component.getName().equals("token"));
    }

    @Test
    @DisplayName("만료·철회·수락된 초대는 미리보기에서 수락 불가로 이유와 함께 표시된다")
    void previewReportsWhyAcceptIsBlocked() {
        when(workspaces.findByIdAndDeletedAtIsNull(workspaceId))
                .thenReturn(Optional.of(Workspace.create("팀하성", "teamsong")));
        when(users.findById(actorId)).thenReturn(Optional.of(inviterNamed("송하성")));

        Invitation expired = invitation(workspaceId, Instant.now().minusSeconds(60));
        when(invitations.findByToken(expired.getToken())).thenReturn(Optional.of(expired));
        assertThat(service.preview(expired.getToken()))
                .satisfies(p -> assertThat(p.acceptable()).isFalse())
                .satisfies(p -> assertThat(p.acceptBlockedReason()).contains("만료"));

        Invitation revoked = pendingInvitation();
        revoked.markRevoked();
        when(invitations.findByToken(revoked.getToken())).thenReturn(Optional.of(revoked));
        assertThat(service.preview(revoked.getToken()))
                .satisfies(p -> assertThat(p.acceptable()).isFalse())
                .satisfies(p -> assertThat(p.acceptBlockedReason()).contains("철회"));

        Invitation accepted = pendingInvitation();
        accepted.markAccepted();
        when(invitations.findByToken(accepted.getToken())).thenReturn(Optional.of(accepted));
        assertThat(service.preview(accepted.getToken()))
                .satisfies(p -> assertThat(p.acceptable()).isFalse())
                .satisfies(p -> assertThat(p.acceptBlockedReason()).contains("이미 수락"));
    }

    @Test
    @DisplayName("없는 토큰은 404 로 다룬다")
    void previewOfUnknownTokenIsNotFound() {
        when(invitations.findByToken("nope")).thenReturn(Optional.empty());
        assertError(() -> service.preview("nope"), ErrorCode.RESOURCE_NOT_FOUND);
    }

    private User inviterNamed(String name) {
        User user = User.create("owner@example.com", name, "hash");
        org.springframework.test.util.ReflectionTestUtils.setField(user, "id", actorId);
        return user;
    }
}
