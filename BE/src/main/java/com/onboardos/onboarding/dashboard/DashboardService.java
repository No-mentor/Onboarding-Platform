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
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import com.onboardos.onboarding.onboarding.OnboardingPlanService;
import com.onboardos.onboarding.onboarding.dto.RecommendationResponse;
import com.onboardos.onboarding.onboarding.dto.TodayRecommendationsResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final WorkspaceAccessService workspaceAccessService;
    private final OnboardingPlanService planService;
    private final OnboardingPlanRepository planRepository;
    private final ChecklistItemRepository checklistItemRepository;

    @Transactional
    public DashboardResponse me(UserPrincipal principal, UUID workspaceId) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());

        OnboardingPlan plan = planRepository
                .findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNull(
                        workspaceId, principal.getId(), "ACTIVE")
                .orElse(null);

        TodayRecommendationsResponse today = planService.today(principal, workspaceId, LocalDate.now());
        List<RecommendationResponse> todayItems = today.items();
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
            long day = ChronoUnit.DAYS.between(plan.getStartDate(), LocalDate.now()) + 1;
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
