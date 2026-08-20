package com.onboardos.onboarding.onboarding;

import com.onboardos.onboarding.domain.plan.ChecklistItem;
import com.onboardos.onboarding.domain.plan.ChecklistItemRepository;
import com.onboardos.onboarding.domain.plan.ItemStatus;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import com.onboardos.onboarding.onboarding.dto.ChecklistResponse;
import com.onboardos.onboarding.onboarding.dto.ChecklistStatusFilter;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 체크리스트 도메인 서비스.
 * 체크리스트 조회, 상태 갱신, 연관 계획 항목·추천 동기화를 담당한다.
 * checklist_items.status 는 PENDING/DONE 만 허용한다 (DB CHECK 제약과 동일).
 */
@Service
@RequiredArgsConstructor
public class ChecklistService {

    private final ChecklistItemRepository checklistItemRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final OnboardingSyncService syncService;

    /**
     * 내 체크리스트를 상태 필터 기준으로 조회한다.
     */
    @Transactional(readOnly = true)
    public List<ChecklistResponse> myChecklist(
            UserPrincipal principal,
            UUID workspaceId,
            ChecklistStatusFilter status
    ) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());

        List<ChecklistItem> items = switch (status) {
            case ALL -> checklistItemRepository
                    .findByWorkspaceIdAndUserIdAndDeletedAtIsNullOrderByDueDayAsc(workspaceId, principal.getId());
            case PENDING -> checklistItemRepository
                    .findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNullOrderByDueDayAsc(
                            workspaceId, principal.getId(), ItemStatus.PENDING);
            case DONE -> checklistItemRepository
                    .findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNullOrderByDueDayAsc(
                            workspaceId, principal.getId(), ItemStatus.DONE);
        };

        return items.stream().map(ChecklistResponse::from).toList();
    }

    /**
     * 체크리스트 항목 상태를 갱신하고, 연관된 계획 항목·추천의 상태도 동기화한다.
     * 체크리스트는 PENDING/DONE 만 지원한다. (SKIPPED/DISMISSED 는 다른 도메인 상태다)
     */
    @Transactional
    public ChecklistResponse updateChecklist(
            UserPrincipal principal,
            UUID workspaceId,
            UUID itemId,
            ItemStatus status
    ) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());
        if (status != ItemStatus.DONE && status != ItemStatus.PENDING) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "체크리스트 상태는 PENDING 또는 DONE만 허용됩니다.");
        }
        ChecklistItem item = checklistItemRepository
                .findByIdAndWorkspaceIdAndUserIdAndDeletedAtIsNull(itemId, workspaceId, principal.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        boolean done = status == ItemStatus.DONE;
        if (done) {
            item.markDone();
        } else {
            item.markPending();
        }

        syncService.syncCluster(workspaceId, principal.getId(), item.getPlanItemId(), done);

        return ChecklistResponse.from(item);
    }
}
