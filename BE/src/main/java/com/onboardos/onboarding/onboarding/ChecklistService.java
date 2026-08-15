package com.onboardos.onboarding.onboarding;

import com.onboardos.onboarding.domain.plan.ChecklistItem;
import com.onboardos.onboarding.domain.plan.ChecklistItemRepository;
import com.onboardos.onboarding.domain.plan.ItemStatus;
import com.onboardos.onboarding.domain.plan.OnboardingPlan;
import com.onboardos.onboarding.domain.plan.OnboardingPlanItemRepository;
import com.onboardos.onboarding.domain.plan.OnboardingPlanRepository;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import com.onboardos.onboarding.onboarding.dto.ChecklistResponse;
import com.onboardos.onboarding.onboarding.dto.ChecklistStatusFilter;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 체크리스트 도메인 서비스.
 * 체크리스트 조회, 상태 갱신, 연관 계획 항목 동기화를 담당한다.
 */
@Service
@RequiredArgsConstructor
public class ChecklistService {

    private final ChecklistItemRepository checklistItemRepository;
    private final OnboardingPlanItemRepository planItemRepository;
    private final OnboardingPlanRepository planRepository;
    private final WorkspaceAccessService workspaceAccessService;

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
     * 체크리스트 항목 상태를 갱신하고, 연관된 계획 항목의 상태도 동기화한다.
     */
    @Transactional
    public ChecklistResponse updateChecklist(
            UserPrincipal principal,
            UUID workspaceId,
            UUID itemId,
            ItemStatus status
    ) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());
        ChecklistItem item = checklistItemRepository
                .findByIdAndWorkspaceIdAndUserIdAndDeletedAtIsNull(itemId, workspaceId, principal.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        if (status == ItemStatus.DONE) {
            item.markDone();
        } else {
            item.markPending();
        }

        syncPlanItemStatus(item, status);

        return ChecklistResponse.from(item);
    }

    // --- private helpers ---

    private void syncPlanItemStatus(ChecklistItem item, ItemStatus status) {
        if (item.getPlanItemId() != null) {
            planItemRepository.findById(item.getPlanItemId()).ifPresent(planItem -> {
                if (status == ItemStatus.DONE) {
                    planItem.markDone();
                } else {
                    planItem.markPending();
                }
                planRepository.findById(planItem.getPlanId()).ifPresent(this::recalculateProgress);
            });
        }
    }

    private void recalculateProgress(OnboardingPlan plan) {
        long total = planItemRepository.countByPlanIdAndStatusNot(plan.getId(), ItemStatus.SKIPPED);
        long done = planItemRepository.countByPlanIdAndStatus(plan.getId(), ItemStatus.DONE);
        BigDecimal percent = total == 0
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(done * 100.0 / total).setScale(2, RoundingMode.HALF_UP);
        plan.updateProgress(percent);
    }
}
