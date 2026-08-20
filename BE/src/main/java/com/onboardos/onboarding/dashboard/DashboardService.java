package com.onboardos.onboarding.dashboard;

import com.onboardos.onboarding.dashboard.dto.DashboardResponse;
import com.onboardos.onboarding.dashboard.dto.DashboardResponse.ChecklistBlock;
import com.onboardos.onboarding.dashboard.dto.DashboardResponse.PlanBlock;
import com.onboardos.onboarding.dashboard.dto.DashboardResponse.TodayBlock;
import com.onboardos.onboarding.domain.plan.ChecklistItem;
import com.onboardos.onboarding.domain.plan.ChecklistItemRepository;
import com.onboardos.onboarding.domain.plan.ItemStatus;
import com.onboardos.onboarding.domain.plan.OnboardingPlan;
import com.onboardos.onboarding.domain.plan.OnboardingPlanRepository;
import com.onboardos.onboarding.domain.plan.PlanStatus;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.time.BusinessClock;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import com.onboardos.onboarding.onboarding.RecommendationService;
import com.onboardos.onboarding.onboarding.dto.RecommendationResponse;
import com.onboardos.onboarding.onboarding.dto.TodayRecommendationsResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final WorkspaceAccessService workspaceAccessService;
    private final RecommendationService recommendationService;
    private final OnboardingPlanRepository planRepository;
    private final ChecklistItemRepository checklistItemRepository;
    // "오늘"은 한국 사용자 기준(Asia/Seoul)이다. JVM 기본 타임존이 UTC 여도 자정~오전 9시 사이에
    // 하루 전 날짜로 계산되지 않게 한다. (createdAt/updatedAt 같은 Instant 타임스탬프는 그대로 UTC)
    private final BusinessClock clock;

    /**
     * 이 메서드에는 일부러 @Transactional(readOnly = true) 를 달지 않는다.
     * 오늘 추천이 아직 없으면 만들어야 하는데(대시보드 첫 진입에서도 오늘 할 일이 보여야 한다),
     * 그 쓰기 책임은 RecommendationService.today() 가 자신의 트랜잭션 안에서 진다.
     * 여기서 읽기 전용 트랜잭션을 열면 REQUIRED 전파로 같은(읽기 전용) 트랜잭션에 합류해
     * 내부 INSERT 가 "read-only transaction" 오류로 막힌다.
     */
    public DashboardResponse me(UserPrincipal principal, UUID workspaceId) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());
        LocalDate businessToday = clock.today();

        // 오늘 추천이 없으면 여기서 생성까지 보장한다 (RecommendationService 가 쓰기 책임을 진다)
        TodayRecommendationsResponse today = recommendationService.today(
                principal, workspaceId, businessToday);
        List<RecommendationResponse> todayItems = today.items();

        OnboardingPlan plan = planRepository
                .findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNull(
                        workspaceId, principal.getId(), PlanStatus.ACTIVE)
                .orElse(null);

        int todayDone = (int) todayItems.stream().filter(i -> i.status() == ItemStatus.DONE).count();

        List<ChecklistItem> checklists = checklistItemRepository
                .findByWorkspaceIdAndUserIdAndDeletedAtIsNullOrderByDueDayAsc(workspaceId, principal.getId());
        int checkTotal = checklists.size();
        int checkDone = (int) checklists.stream().filter(c -> c.getStatus() == ItemStatus.DONE).count();

        BigDecimal progress = plan == null ? BigDecimal.ZERO : plan.getProgressPercent();
        PlanBlock planBlock = null;
        String message;

        if (plan == null) {
            message = "온보딩 계획이 없습니다. 관리자에게 초대를 받거나 계획을 생성해 주세요.";
        } else {
            long day = ChronoUnit.DAYS.between(plan.getStartDate(), businessToday) + 1;
            int currentDay = (int) Math.min(30, Math.max(1, day));
            planBlock = new PlanBlock(plan.getId(), currentDay, 30, plan.getStatus());
            message = "오늘 할 일과 진행률을 확인하세요.";
        }

        return new DashboardResponse(
                progress,
                new TodayBlock(todayItems.size(), todayDone, todayItems),
                planBlock,
                new ChecklistBlock(checkTotal, checkDone),
                message
        );
    }
}
