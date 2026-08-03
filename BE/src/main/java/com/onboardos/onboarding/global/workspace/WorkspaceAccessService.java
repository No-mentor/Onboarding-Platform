package com.onboardos.onboarding.global.workspace;

import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.MembershipRepository;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkspaceAccessService {

    private final MembershipRepository membershipRepository;

    @Transactional(readOnly = true)
    public Membership requireMembership(UUID workspaceId, UUID userId) {
        return membershipRepository
                .findByWorkspaceIdAndUserIdAndDeletedAtIsNull(workspaceId, userId)
                .filter(Membership::isActive)
                .orElseThrow(() -> new BusinessException(ErrorCode.WORKSPACE_MISMATCH));
    }

    @Transactional(readOnly = true)
    public Membership requireRoles(UUID workspaceId, UUID userId, UserRole... roles) {
        Membership membership = requireMembership(workspaceId, userId);
        Set<UserRole> allowed = EnumSet.copyOf(Arrays.asList(roles));
        if (!allowed.contains(membership.getRole())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "해당 작업을 수행할 권한이 없습니다.");
        }
        return membership;
    }

    @Transactional(readOnly = true)
    public boolean hasAnyRole(UUID workspaceId, UUID userId, UserRole... roles) {
        return membershipRepository
                .findByWorkspaceIdAndUserIdAndDeletedAtIsNull(workspaceId, userId)
                .filter(Membership::isActive)
                .map(m -> EnumSet.copyOf(Arrays.asList(roles)).contains(m.getRole()))
                .orElse(false);
    }
}
