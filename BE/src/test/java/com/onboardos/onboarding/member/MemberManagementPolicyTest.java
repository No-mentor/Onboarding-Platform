package com.onboardos.onboarding.member;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.MembershipStatus;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class MemberManagementPolicyTest {
    private final MemberManagementPolicy policy = new MemberManagementPolicy();

    @Test void ownerCanInviteOwner() { assertThatCode(() -> policy.validateInvitation(member(UserRole.OWNER), UserRole.OWNER)).doesNotThrowAnyException(); }
    @Test void adminCanInviteAdmin() { assertThatCode(() -> policy.validateInvitation(member(UserRole.ADMIN), UserRole.ADMIN)).doesNotThrowAnyException(); }
    @Test void adminCannotInviteOwner() { assertForbidden(() -> policy.validateInvitation(member(UserRole.ADMIN), UserRole.OWNER)); }
    @Test void ownerCanPromoteMemberToOwner() { assertThatCode(() -> policy.validateUpdate(member(UserRole.OWNER), member(UserRole.MEMBER), UserRole.OWNER, null)).doesNotThrowAnyException(); }
    @Test void adminCannotPromoteMemberToOwner() { assertForbidden(() -> policy.validateUpdate(member(UserRole.ADMIN), member(UserRole.MEMBER), UserRole.OWNER, null)); }
    @Test void adminCannotPromoteSelfToOwner() { Membership admin = member(UserRole.ADMIN); assertForbidden(() -> policy.validateUpdate(admin, admin, UserRole.OWNER, null)); }
    @Test void adminCannotChangeOwnerRole() { assertForbidden(() -> policy.validateUpdate(member(UserRole.ADMIN), member(UserRole.OWNER), UserRole.ADMIN, null)); }
    @Test void adminCannotChangeOwnerStatus() { assertForbidden(() -> policy.validateUpdate(member(UserRole.ADMIN), member(UserRole.OWNER), null, MembershipStatus.DISABLED)); }
    @Test void adminCanManageMemberRole() { assertThatCode(() -> policy.validateUpdate(member(UserRole.ADMIN), member(UserRole.MEMBER), UserRole.MANAGER, null)).doesNotThrowAnyException(); }
    @Test void adminCanManageMemberStatus() { assertThatCode(() -> policy.validateUpdate(member(UserRole.ADMIN), member(UserRole.MEMBER), null, MembershipStatus.DISABLED)).doesNotThrowAnyException(); }

    private Membership member(UserRole role) { return Membership.create(UUID.randomUUID(), UUID.randomUUID(), role, null, null, null); }
    private void assertForbidden(org.assertj.core.api.ThrowableAssert.ThrowingCallable action) {
        assertThatThrownBy(action).isInstanceOfSatisfying(BusinessException.class,
                ex -> org.assertj.core.api.Assertions.assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.FORBIDDEN));
    }
}
