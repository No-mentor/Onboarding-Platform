package com.onboardos.onboarding.member;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.onboardos.onboarding.domain.invitation.InvitationRepository;
import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.MembershipRepository;
import com.onboardos.onboarding.domain.user.MembershipStatus;
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
import com.onboardos.onboarding.member.dto.UpdateMemberRequest;
import com.onboardos.onboarding.onboarding.OnboardingPlanService;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MemberServiceAuthorizationTest {
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
    private final UserPrincipal principal = new UserPrincipal(actorId, "actor@example.com", "hash", true);

    @BeforeEach void workspaceLock() {
        when(workspaces.findByIdForMemberUpdate(workspaceId)).thenReturn(Optional.of(mock(Workspace.class)));
    }

    @Test void ownerInvitationForOwnerSucceedsAndSendsMail() {
        actor(UserRole.OWNER);
        service.invite(principal, workspaceId, invitation(UserRole.OWNER));
        verify(invitations).save(any());
        verify(mail).sendInvitationEmail(any(), any(), any());
    }

    @Test void adminInvitationForAdminSucceeds() {
        actor(UserRole.ADMIN);
        service.invite(principal, workspaceId, invitation(UserRole.ADMIN));
        verify(invitations).save(any());
    }

    @Test void adminOwnerInvitationFailsBeforePersistenceAndMail() {
        actor(UserRole.ADMIN);
        assertForbidden(() -> service.invite(principal, workspaceId, invitation(UserRole.OWNER)));
        verify(invitations, never()).save(any());
        verify(mail, never()).sendInvitationEmail(any(), any(), any());
        verify(users, never()).findByEmailAndDeletedAtIsNull(any());
    }

    @Test void ownerPromotesMemberToOwner() {
        actor(UserRole.OWNER);
        Membership target = target(UserRole.MEMBER);
        when(memberships.findById(target.getId())).thenReturn(Optional.of(target));
        service.update(principal, workspaceId, target.getId(), new UpdateMemberRequest(UserRole.OWNER, null));
        assertThat(target.getRole()).isEqualTo(UserRole.OWNER);
    }

    @Test void adminManagesMember() {
        actor(UserRole.ADMIN);
        Membership target = target(UserRole.MEMBER);
        when(memberships.findById(target.getId())).thenReturn(Optional.of(target));
        service.update(principal, workspaceId, target.getId(), new UpdateMemberRequest(UserRole.MANAGER, MembershipStatus.DISABLED));
        assertThat(target.getRole()).isEqualTo(UserRole.MANAGER);
        assertThat(target.getStatus()).isEqualTo(MembershipStatus.DISABLED);
    }

    @Test void adminCannotPromoteMemberAndEntityIsUnchanged() {
        actor(UserRole.ADMIN);
        Membership target = target(UserRole.MEMBER);
        when(memberships.findById(target.getId())).thenReturn(Optional.of(target));
        assertForbidden(() -> service.update(principal, workspaceId, target.getId(), new UpdateMemberRequest(UserRole.OWNER, null)));
        assertThat(target.getRole()).isEqualTo(UserRole.MEMBER);
    }

    @Test void adminCannotChangeOwnerStatusAndEntityIsUnchanged() {
        actor(UserRole.ADMIN);
        Membership target = target(UserRole.OWNER);
        when(memberships.findById(target.getId())).thenReturn(Optional.of(target));
        assertForbidden(() -> service.update(principal, workspaceId, target.getId(), new UpdateMemberRequest(null, MembershipStatus.DISABLED)));
        assertThat(target.getStatus()).isEqualTo(MembershipStatus.ACTIVE);
        verify(memberships, never()).countByWorkspaceIdAndRoleAndStatusAndDeletedAtIsNull(any(), any(), any());
    }

    @Test void lastActiveOwnerCannotBeDemoted() {
        actor(UserRole.OWNER);
        Membership target = target(UserRole.OWNER);
        when(memberships.findById(target.getId())).thenReturn(Optional.of(target));
        when(memberships.countByWorkspaceIdAndRoleAndStatusAndDeletedAtIsNull(workspaceId, UserRole.OWNER, MembershipStatus.ACTIVE)).thenReturn(1L);
        assertConflict(() -> service.update(principal, workspaceId, target.getId(), new UpdateMemberRequest(UserRole.ADMIN, null)));
        assertThat(target.getRole()).isEqualTo(UserRole.OWNER);
    }

    @Test void lastActiveOwnerCannotBeDisabled() {
        actor(UserRole.OWNER);
        Membership target = target(UserRole.OWNER);
        when(memberships.findById(target.getId())).thenReturn(Optional.of(target));
        when(memberships.countByWorkspaceIdAndRoleAndStatusAndDeletedAtIsNull(workspaceId, UserRole.OWNER, MembershipStatus.ACTIVE)).thenReturn(1L);
        assertConflict(() -> service.update(principal, workspaceId, target.getId(), new UpdateMemberRequest(null, MembershipStatus.DISABLED)));
        assertThat(target.getStatus()).isEqualTo(MembershipStatus.ACTIVE);
    }

    @Test void oneOfMultipleOwnersCanBeDemoted() {
        actor(UserRole.OWNER);
        Membership target = target(UserRole.OWNER);
        when(memberships.findById(target.getId())).thenReturn(Optional.of(target));
        when(memberships.countByWorkspaceIdAndRoleAndStatusAndDeletedAtIsNull(workspaceId, UserRole.OWNER, MembershipStatus.ACTIVE)).thenReturn(2L);
        service.update(principal, workspaceId, target.getId(), new UpdateMemberRequest(UserRole.ADMIN, null));
        assertThat(target.getRole()).isEqualTo(UserRole.ADMIN);
    }

    @Test void memberFromAnotherWorkspaceIsNotExposedOrChanged() {
        actor(UserRole.OWNER);
        Membership target = Membership.create(UUID.randomUUID(), UUID.randomUUID(), UserRole.MEMBER, null, null, null);
        when(memberships.findById(target.getId())).thenReturn(Optional.of(target));
        assertThatThrownBy(() -> service.update(principal, workspaceId, target.getId(), new UpdateMemberRequest(UserRole.ADMIN, null)))
                .isInstanceOfSatisfying(BusinessException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
        assertThat(target.getRole()).isEqualTo(UserRole.MEMBER);
    }

    @Test void inactiveActorIsRejectedBeforeTargetLookup() {
        when(access.requireRoles(workspaceId, actorId, UserRole.OWNER, UserRole.ADMIN))
                .thenThrow(new BusinessException(ErrorCode.WORKSPACE_MISMATCH));
        assertThatThrownBy(() -> service.update(principal, workspaceId, UUID.randomUUID(), new UpdateMemberRequest(UserRole.ADMIN, null)))
                .isInstanceOf(BusinessException.class);
        verify(memberships, never()).findById(any());
        verify(workspaces, never()).findByIdForMemberUpdate(any());
    }

    private void actor(UserRole role) {
        when(access.requireRoles(workspaceId, actorId, UserRole.OWNER, UserRole.ADMIN))
                .thenReturn(Membership.create(workspaceId, actorId, role, null, null, null));
    }
    private Membership target(UserRole role) { return Membership.create(workspaceId, UUID.randomUUID(), role, null, null, null); }
    private CreateInvitationRequest invitation(UserRole role) { return new CreateInvitationRequest("invitee@example.com", role, null, null, null); }
    private void assertForbidden(org.assertj.core.api.ThrowableAssert.ThrowingCallable action) { assertError(action, ErrorCode.FORBIDDEN); }
    private void assertConflict(org.assertj.core.api.ThrowableAssert.ThrowingCallable action) { assertError(action, ErrorCode.CONFLICT); }
    private void assertError(org.assertj.core.api.ThrowableAssert.ThrowingCallable action, ErrorCode code) {
        assertThatThrownBy(action).isInstanceOfSatisfying(BusinessException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(code));
    }
}
