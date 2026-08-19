package com.onboardos.onboarding.member;

import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.MembershipStatus;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import org.springframework.stereotype.Component;

@Component
public class MemberManagementPolicy {
    public void validateInvitation(Membership actor, UserRole invitedRole) {
        if (actor.getRole() == UserRole.ADMIN && invitedRole == UserRole.OWNER) {
            deny();
        }
    }

    public void validateUpdate(Membership actor, Membership target, UserRole role, MembershipStatus status) {
        if (actor.getRole() != UserRole.ADMIN) {
            return;
        }
        boolean promotesToOwner = role == UserRole.OWNER && target.getRole() != UserRole.OWNER;
        boolean changesOwner = target.getRole() == UserRole.OWNER
                && ((role != null && role != target.getRole())
                    || (status != null && status != target.getStatus()));
        if (promotesToOwner || changesOwner) {
            deny();
        }
    }

    private void deny() {
        throw new BusinessException(ErrorCode.FORBIDDEN);
    }
}
