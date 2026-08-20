package com.onboardos.onboarding.onboarding;

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
import com.onboardos.onboarding.global.time.BusinessClock;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import com.onboardos.onboarding.onboarding.dto.RecommendationResponse;
import com.onboardos.onboarding.onboarding.dto.TodayRecommendationsResponse;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
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
    private final DailyRecommendationRepository recommendationRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final OnboardingSyncService syncService;
    // "오늘"은 한국 사용자 기준(Asia/Seoul)이다. JVM 기본 타임존이 UTC 여도 자정~오전 9시 사이에
    // 하루 전 날짜로 계산되지 않게 한다.
    private final BusinessClock clock;

    /**
     * 오늘 할 일 추천 목록을 조회하거나, 없으면 계획 기반으로 생성한다.
     * 대시보드 첫 진입처럼 아직 오늘 추천이 없는 상태에서도 호출되므로, 이 메서드가
     * "오늘 추천이 반드시 존재하게 만드는" 쓰기 책임을 진다. (읽기 전용 트랜잭션에서는 호출하지 않는다)
     */
    @Transactional
    public TodayRecommendationsResponse today(UserPrincipal principal, UUID workspaceId, LocalDate date) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());
        return todayFor(workspaceId, principal.getId(), date);
    }

    private TodayRecommendationsResponse todayFor(UUID workspaceId, UUID userId, LocalDate date) {
        LocalDate target = date == null ? clock.today() : date;

        OnboardingPlan plan = planRepository
                .findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNull(workspaceId, userId, PlanStatus.ACTIVE)
                .orElse(null);

        List<DailyRecommendation> existing = recommendationRepository
                .findByWorkspaceIdAndUserIdAndRecommendDateOrderByPriorityAsc(
                        workspaceId, userId, target);

        if (plan != null) {
            // 방어선: 계획이 재생성됐는데 그 시점에 정리되지 못한(또는 다른 경로로 남은) 오늘의
            // 추천이 있으면, 최소한 더 이상 존재하지 않는 계획 항목을 가리키는 추천은 보여주지 않는다.
            existing = dropStaleForPlan(existing, plan);
        }

        if (existing.isEmpty() && plan != null) {
            existing = generateFromPlanSafely(workspaceId, userId, target, plan);
        }

        return new TodayRecommendationsResponse(
                target,
                existing.stream().map(RecommendationResponse::from).toList()
        );
    }

    /**
     * planItemId 가 있는데 그 항목이 현재 활성 계획에 없으면(예전 계획이 재생성되며 archived 된 경우)
     * stale 한 추천이다. planItemId 가 없는(fallback) 추천은 그대로 둔다.
     */
    private List<DailyRecommendation> dropStaleForPlan(List<DailyRecommendation> recs, OnboardingPlan plan) {
        boolean hasPlanLinked = recs.stream().anyMatch(r -> r.getPlanItemId() != null);
        if (!hasPlanLinked) {
            return recs;
        }
        Set<UUID> validItemIds = planItemRepository.findByPlanIdOrderByDayIndexAscSortOrderAsc(plan.getId())
                .stream().map(OnboardingPlanItem::getId).collect(Collectors.toSet());
        return recs.stream()
                .filter(r -> r.getPlanItemId() == null || validItemIds.contains(r.getPlanItemId()))
                .toList();
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

        syncService.syncCluster(workspaceId, principal.getId(), rec.getPlanItemId(), true);

        return RecommendationResponse.from(rec);
    }

    /**
     * 추천 항목 dismiss 처리 (관심 없음/건너뛰기).
     */
    @Transactional
    public RecommendationResponse dismiss(UserPrincipal principal, UUID workspaceId, UUID recommendationId) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());
        DailyRecommendation rec = recommendationRepository
                .findByIdAndWorkspaceIdAndUserId(recommendationId, workspaceId, principal.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        rec.dismiss();

        return RecommendationResponse.from(rec);
    }

    // --- private helpers ---

    /**
     * 동시 요청이 먼저 오늘 추천을 만들었을 수 있다 (uq_daily_reco_plan_item_day).
     * 그 경우 새로 만들지 않고, 먼저 커밋된 추천을 그대로 읽어 돌려준다.
     */
    private List<DailyRecommendation> generateFromPlanSafely(
            UUID workspaceId, UUID userId, LocalDate target, OnboardingPlan plan
    ) {
        try {
            return generateFromPlan(workspaceId, userId, target, plan);
        } catch (DataIntegrityViolationException raceLost) {
            return recommendationRepository
                    .findByWorkspaceIdAndUserIdAndRecommendDateOrderByPriorityAsc(workspaceId, userId, target);
        }
    }

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
            // 오늘 배정된 계획 항목이 없으면 복습 추천 1건을 만든다.
            // 실제 계획 항목과 연결하지 않는다 (임시 항목을 저장하지 않고 FK 로 넣으면 제약 위반이 난다)
            DailyRecommendation r = DailyRecommendation.fallback(
                    workspaceId, userId, target, PlanItemType.PRACTICE,
                    "오늘 학습 복습 및 질문 정리", 1
            );
            recommendationRepository.saveAndFlush(r);
            return List.of(r);
        }

        recommendationRepository.saveAll(created);
        recommendationRepository.flush();
        return created;
    }
}
