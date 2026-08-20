package com.onboardos.onboarding.onboarding;

import com.onboardos.onboarding.domain.plan.ChecklistItem;
import com.onboardos.onboarding.domain.plan.ChecklistItemRepository;
import com.onboardos.onboarding.domain.plan.DailyRecommendation;
import com.onboardos.onboarding.domain.plan.DailyRecommendationRepository;
import com.onboardos.onboarding.domain.plan.ItemStatus;
import com.onboardos.onboarding.domain.plan.OnboardingPlan;
import com.onboardos.onboarding.domain.plan.OnboardingPlanItem;
import com.onboardos.onboarding.domain.plan.OnboardingPlanItemRepository;
import com.onboardos.onboarding.domain.plan.OnboardingPlanRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * PlanItem / ChecklistItem / DailyRecommendation 은 같은 업무를 세 곳에서 따로 추적한다.
 * 체크리스트·계획·추천 중 어느 한쪽에서 완료(또는 완료 취소)하면, 같은 planItemId 로 연결된
 * 나머지 두 곳과 계획 진행률(progressPercent)까지 이 서비스가 함께 맞춘다.
 *
 * 이미 목표 상태인 항목은 다시 쓰지 않는다. (completedAt 이 호출마다 갱신되는 것을 막기 위함)
 * DISMISSED 인 추천은 건드리지 않는다. (사용자가 건너뛴 추천을 다른 경로의 변경으로 되살리지 않기 위함)
 */
@Service
@RequiredArgsConstructor
class OnboardingSyncService {

    private final OnboardingPlanRepository planRepository;
    private final OnboardingPlanItemRepository planItemRepository;
    private final ChecklistItemRepository checklistItemRepository;
    private final DailyRecommendationRepository recommendationRepository;

    /**
     * planItemId 로 연결된 PlanItem·ChecklistItem·DailyRecommendation 을 모두 done/pending 으로
     * 맞추고 계획 진행률을 다시 계산한다. planItemId 가 없으면 (연결된 계획 항목이 없는 독립 항목)
     * 할 일이 없다.
     */
    @Transactional
    void syncCluster(UUID workspaceId, UUID userId, UUID planItemId, boolean done) {
        if (planItemId == null) {
            return;
        }
        OnboardingPlanItem planItem = planItemRepository.findById(planItemId).orElse(null);
        if (planItem == null) {
            return;
        }

        applyPlanItem(planItem, done);

        checklistItemRepository
                .findByWorkspaceIdAndUserIdAndPlanItemIdAndDeletedAtIsNull(workspaceId, userId, planItemId)
                .ifPresent(checklist -> applyChecklist(checklist, done));

        for (DailyRecommendation rec : recommendationRepository
                .findByWorkspaceIdAndUserIdAndPlanItemId(workspaceId, userId, planItemId)) {
            if (rec.getStatus() == ItemStatus.DISMISSED) {
                continue;
            }
            applyRecommendation(rec, done);
        }

        planRepository.findById(planItem.getPlanId()).ifPresent(this::recalculateProgress);
    }

    @Transactional
    void recalculateProgress(OnboardingPlan plan) {
        long total = planItemRepository.countByPlanIdAndStatusNot(plan.getId(), ItemStatus.SKIPPED);
        long done = planItemRepository.countByPlanIdAndStatus(plan.getId(), ItemStatus.DONE);
        BigDecimal percent = total == 0
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(done * 100.0 / total).setScale(2, RoundingMode.HALF_UP);
        plan.updateProgress(percent);
    }

    private void applyPlanItem(OnboardingPlanItem item, boolean done) {
        if (done) {
            if (item.getStatus() != ItemStatus.DONE) item.markDone();
        } else if (item.getStatus() != ItemStatus.PENDING) {
            item.markPending();
        }
    }

    private void applyChecklist(ChecklistItem item, boolean done) {
        if (done) {
            if (item.getStatus() != ItemStatus.DONE) item.markDone();
        } else if (item.getStatus() != ItemStatus.PENDING) {
            item.markPending();
        }
    }

    private void applyRecommendation(DailyRecommendation rec, boolean done) {
        if (done) {
            if (rec.getStatus() != ItemStatus.DONE) rec.markDone();
        } else if (rec.getStatus() == ItemStatus.DONE) {
            rec.markPending();
        }
    }
}
