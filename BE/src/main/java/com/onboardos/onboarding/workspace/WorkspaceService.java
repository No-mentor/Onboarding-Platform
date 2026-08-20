package com.onboardos.onboarding.workspace;

import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.MembershipRepository;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.domain.workspace.Workspace;
import com.onboardos.onboarding.domain.workspace.WorkspaceRepository;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.workspace.dto.CreateWorkspaceRequest;
import com.onboardos.onboarding.workspace.dto.UpdateWorkspaceRequest;
import com.onboardos.onboarding.workspace.dto.WorkspaceListResponse;
import com.onboardos.onboarding.workspace.dto.WorkspaceResponse;
import com.onboardos.onboarding.workspace.dto.WorkspaceSummaryResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final MembershipRepository membershipRepository;

    @Transactional
    public WorkspaceResponse create(UserPrincipal principal, CreateWorkspaceRequest request) {
        String slug = request.slug().trim().toLowerCase();
        if (workspaceRepository.existsBySlugAndDeletedAtIsNull(slug)) {
            throw new BusinessException(ErrorCode.CONFLICT, "이미 사용 중인 slug 입니다.");
        }

        Workspace workspace = Workspace.create(request.name(), slug);
        workspace = workspaceRepository.save(workspace);

        Membership owner = Membership.createOwner(workspace.getId(), principal.getId());
        membershipRepository.save(owner);

        return new WorkspaceResponse(
                workspace.getId(),
                workspace.getName(),
                workspace.getSlug(),
                workspace.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public WorkspaceListResponse myWorkspaces(UserPrincipal principal) {
        List<Membership> memberships = membershipRepository.findByUserIdAndDeletedAtIsNull(principal.getId())
                .stream()
                .filter(Membership::isActive)
                .toList();

        Map<UUID, Workspace> map = workspaceRepository.findAllById(
                memberships.stream().map(Membership::getWorkspaceId).toList()
        ).stream()
                .filter(w -> w.getDeletedAt() == null)
                .collect(Collectors.toMap(Workspace::getId, Function.identity()));

        List<WorkspaceSummaryResponse> items = memberships.stream()
                .filter(m -> map.containsKey(m.getWorkspaceId()))
                .map(m -> {
                    Workspace ws = map.get(m.getWorkspaceId());
                    return new WorkspaceSummaryResponse(ws.getId(), ws.getName(), ws.getSlug(), m.getRole());
                })
                .toList();

        return new WorkspaceListResponse(items);
    }

    @Transactional
    public WorkspaceResponse update(UserPrincipal principal, UUID workspaceId, UpdateWorkspaceRequest request) {
        requireRole(principal.getId(), workspaceId, UserRole.OWNER, UserRole.ADMIN);

        Workspace workspace = workspaceRepository.findByIdAndDeletedAtIsNull(workspaceId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Workspace를 찾을 수 없습니다."));

        workspace.rename(request.name());
        return new WorkspaceResponse(
                workspace.getId(),
                workspace.getName(),
                workspace.getSlug(),
                workspace.getCreatedAt()
        );
    }

    private void requireRole(UUID userId, UUID workspaceId, UserRole... allowed) {
        Membership membership = membershipRepository
                .findByWorkspaceIdAndUserIdAndDeletedAtIsNull(workspaceId, userId)
                .filter(Membership::isActive)
                .orElseThrow(() -> new BusinessException(ErrorCode.WORKSPACE_MISMATCH));

        for (UserRole role : allowed) {
            if (membership.getRole() == role) {
                return;
            }
        }
        throw new BusinessException(ErrorCode.FORBIDDEN, "Workspace 수정 권한이 없습니다.");
    }
}
