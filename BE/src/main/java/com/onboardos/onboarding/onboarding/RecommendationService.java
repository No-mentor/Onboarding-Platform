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
import com.onboardos.onboarding.domain.plan.PlanItemType;
import com.onboardos.onboarding.domain.plan.PlanStatus;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import com.onboardos.onboarding.onboarding.dto.RecommendationResponse;
import com.onboardos.onboarding.onboarding.dto.TodayRecommendationsResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 일일 추천(오늘 할 일) 도메인 서비스.
 * 계획 기반 추천 생성, 완료 처리, dismiss 처리를 담당한다.
 */
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final OnboardingPlanRepository planRepository;
    private final OnboardingPlanItemRepository planItemRepository;
    private final ChecklistItemRepository checklistItemRepository;
    private final DailyRecommendationRepository recommendationRepository;
    private final WorkspaceAccessService workspaceAccessService;

    /**
     * 오늘 할 일 추천 목록을 조회하거나, 없으면 계획 기반으로 생성한다.
     */
    @Transactional
    public TodayRecommendationsResponse today(UserPrincipal principal, UUID workspaceId, LocalDate date) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());
        LocalDate target = date == null ? LocalDate.now() : date;

        OnboardingPlan plan = planRepository
                .findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNull(workspaceId, principal.getId(), PlanStatus.ACTIVE)
                .orElse(null);

        List<DailyRecommendation> existing = recommendationRepository
                .findByWorkspaceIdAndUserIdAndRecommendDateOrderByPriorityAsc(
                        workspaceId, principal.getId(), target);

        if (existing.isEmpty() && plan != null) {
            existing = generateFromPlan(workspaceId, principal.getId(), target, plan);
        }

        return new TodayRecommendationsResponse(
                target,
                existing.stream().map(RecommendationResponse::from).toList()
        );
    }

    /**
     * 추천 조회 전용 (side-effect 없이 기존 추천만 반환).
     * Dashboard 등에서 이미 생성된 추천만 가져올 때 사용한다.
     */
    @Transactional(readOnly = true)
    public TodayRecommendationsResponse todayReadOnly(UUID workspaceId, UUID userId, LocalDate date) {
        LocalDate target = date == null ? LocalDate.now() : date;

        List<DailyRecommendation> existing = recommendationRepository
                .findByWorkspaceIdAndUserIdAndRecommendDateOrderByPriorityAsc(
                        workspaceId, userId, target);

        return new TodayRecommendationsResponse(
                target,
                existing.stream().map(RecommendationResponse::from).toList()
        );
    }

    /**
     * 추천 항목 완료 처리. 연관된 계획 항목과 체크리스트도 동기화한다.
     */
    @Transactional
    public RecommendationResponse complete(UserPrincipal principal, UUID workspaceId, UUID recommendationId) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());
        DailyRecommendation rec = recommendationRepository
                .findByIdAndWorkspaceIdAndUserId(recommendationId, workspaceId, principal.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        rec.markDone();

        syncPlanItemOnComplete(workspaceId, principal.getId(), rec);

        return RecommendationResponse.from(rec);
    }

    /**
     * 추천 항목 dismiss 처리 (관심 없음/건너뛰기).
     * 연관된 계획 항목이 있으면 SKIPPED로 전이하고 진행률을 재계산한다.
     */
    @Transactional
    public RecommendationResponse dismiss(UserPrincipal principal, UUID workspaceId, UUID recommendationId) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());
        DailyRecommendation rec = recommendationRepository
                .findByIdAndWorkspaceIdAndUserId(recommendationId, workspaceId, principal.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        rec.dismiss();

        // 연관 계획 항목을 SKIPPED로 전이 → 진행률 분모에서 제외
        if (rec.getPlanItemId() != null) {
            planItemRepository.findById(rec.getPlanItemId()).ifPresent(item -> {
                item.skip();
                planRepository.findById(item.getPlanId()).ifPresent(this::recalculateProgress);
            });
        }

        return RecommendationResponse.from(rec);
    }

    // --- private helpers ---

    private List<DailyRecommendation> generateFromPlan(
            UUID workspaceId, UUID userId, LocalDate target, OnboardingPlan plan
    ) {
        long day = ChronoUnit.DAYS.between(plan.getStartDate(), target) + 1;
        int dayIndex = (int) Math.min(30, Math.max(1, day));

        List<OnboardingPlanItem> dayItems = planItemRepository
                .findByPlanIdAndDayIndexOrderBySortOrderAsc(plan.getId(), dayIndex)
                .stream()
                .filter(i -> i.getStatus() != ItemStatus.DONE)
                .toList();

        List<DailyRecommendation> created = new ArrayList<>();
        int priority = 1;
        for (OnboardingPlanItem item : dayItems) {
            created.add(DailyRecommendation.fromPlanItem(workspaceId, userId, target, item, priority++));
        }

        if (created.isEmpty()) {
            // 오늘 할 일이 없으면 복습 추천 1건 생성
            OnboardingPlanItem fallback = OnboardingPlanItem.create(
                    plan.getId(), workspaceId, dayIndex, PlanItemType.PRACTICE,
                    "오늘 학습 복습 및 질문 정리", "진행 가능한 항목이 없어 복습을 추천합니다.", 0, null, null
            );
            DailyRecommendation r = DailyRecommendation.fromPlanItem(workspaceId, userId, target, fallback, 1);
            recommendationRepository.save(r);
            return List.of(r);
        }

        recommendationRepository.saveAll(created);
        return created;
    }

    private void syncPlanItemOnComplete(UUID workspaceId, UUID userId, DailyRecommendation rec) {
        if (rec.getPlanItemId() != null) {
            planItemRepository.findById(rec.getPlanItemId()).ifPresent(item -> {
                item.markDone();
                checklistItemRepository
                        .findByWorkspaceIdAndUserIdAndPlanItemIdAndDeletedAtIsNull(
                                workspaceId, userId, item.getId())
                        .ifPresent(ChecklistItem::markDone);
                planRepository.findById(item.getPlanId()).ifPresent(this::recalculateProgress);
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
