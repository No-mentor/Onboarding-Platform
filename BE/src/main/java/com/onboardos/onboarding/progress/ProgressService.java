package com.onboardos.onboarding.progress;

import com.onboardos.onboarding.domain.plan.ItemStatus;
import com.onboardos.onboarding.domain.plan.OnboardingPlan;
import com.onboardos.onboarding.domain.plan.OnboardingPlanItem;
import com.onboardos.onboarding.domain.plan.OnboardingPlanItemRepository;
import com.onboardos.onboarding.domain.plan.OnboardingPlanRepository;
import com.onboardos.onboarding.domain.plan.PlanStatus;
import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.MembershipStatus;
import com.onboardos.onboarding.domain.user.MembershipRepository;
import com.onboardos.onboarding.domain.user.User;
import com.onboardos.onboarding.domain.user.UserRepository;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.time.BusinessClock;
import com.onboardos.onboarding.global.web.PageResponse;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import com.onboardos.onboarding.progress.dto.AdminProgressDetailResponse;
import com.onboardos.onboarding.progress.dto.AdminProgressItemResponse;
import com.onboardos.onboarding.progress.dto.MyProgressResponse;
import com.onboardos.onboarding.progress.dto.MyProgressResponse.OverdueItem;
import java.math.BigDecimal;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProgressService {

    private final WorkspaceAccessService workspaceAccessService;
    private final OnboardingPlanRepository planRepository;
    private final OnboardingPlanItemRepository planItemRepository;
    private final MembershipRepository membershipRepository;
    private final UserRepository userRepository;
    // "오늘"은 한국 사용자 기준(Asia/Seoul)이다. dayIndex/기한 경과 판정에 쓴다.
    private final BusinessClock clock;

    @Transactional(readOnly = true)
    public MyProgressResponse myProgress(UserPrincipal principal, UUID workspaceId) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());
        OnboardingPlan plan = planRepository
                .findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNull(
                        workspaceId, principal.getId(), PlanStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "온보딩 계획이 없습니다."));
        return buildProgress(plan);
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminProgressItemResponse> adminList(
            UserPrincipal principal,
            UUID workspaceId,
            int page,
            int size
    ) {
        workspaceAccessService.requireRoles(
                workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER
        );

        int normalizedPage = Math.max(0, page);
        int normalizedSize = Math.min(100, Math.max(1, size));
        PageRequest pageable = PageRequest.of(normalizedPage, normalizedSize);

        Page<Membership> newHires = membershipRepository
                .findByWorkspaceIdAndRoleAndStatusAndDeletedAtIsNull(
                        workspaceId,
                        UserRole.NEW_HIRE,
                        MembershipStatus.ACTIVE,
                        pageable
                );

        Map<UUID, User> users = userRepository.findAllById(
                newHires.getContent().stream().map(Membership::getUserId).toList()
        ).stream().collect(Collectors.toMap(User::getId, Function.identity()));

        List<AdminProgressItemResponse> result = new ArrayList<>();
        for (Membership m : newHires.getContent()) {
            User user = users.get(m.getUserId());
            OnboardingPlan plan = planRepository
                    .findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNull(
                            workspaceId, m.getUserId(), PlanStatus.ACTIVE)
                    .orElse(null);

            BigDecimal progress = plan == null ? BigDecimal.ZERO : plan.getProgressPercent();
            UUID planId = plan == null ? null : plan.getId();
            int currentDay = 0;
            String status = "NO_PLAN";
            if (plan != null) {
                long day = ChronoUnit.DAYS.between(plan.getStartDate(), clock.today()) + 1;
                currentDay = (int) Math.min(30, Math.max(1, day));
                status = classifyStatus(progress, currentDay, plan);
            }

            result.add(new AdminProgressItemResponse(
                    m.getUserId(),
                    user == null ? null : user.getName(),
                    user == null ? null : user.getEmail(),
                    progress,
                    status,
                    planId,
                    currentDay
            ));
        }

        return new PageResponse<>(
                result,
                newHires.getNumber(),
                newHires.getSize(),
                newHires.getTotalElements(),
                newHires.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public AdminProgressDetailResponse adminDetail(
            UserPrincipal principal,
            UUID workspaceId,
            UUID userId
    ) {
        workspaceAccessService.requireRoles(
                workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER
        );

        User user = userRepository.findById(userId)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "사용자를 찾을 수 없습니다."));

        OnboardingPlan plan = planRepository
                .findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNull(workspaceId, userId, PlanStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "온보딩 계획이 없습니다."));

        MyProgressResponse progress = buildProgress(plan);
        String insights = buildInsights(progress, plan);

        return new AdminProgressDetailResponse(
                userId,
                user.getName(),
                user.getEmail(),
                progress.progressPercent(),
                plan.getId(),
                progress.overdueItems(),
                insights
        );
    }

    private MyProgressResponse buildProgress(OnboardingPlan plan) {
        List<OnboardingPlanItem> items = planItemRepository
                .findByPlanIdOrderByDayIndexAscSortOrderAsc(plan.getId());

        long total = items.stream().filter(i -> i.getStatus() != ItemStatus.SKIPPED).count();
        long done = items.stream().filter(i -> i.getStatus() == ItemStatus.DONE).count();

        long currentDay = ChronoUnit.DAYS.between(plan.getStartDate(), clock.today()) + 1;
        int dayCap = (int) Math.min(30, Math.max(1, currentDay));

        List<OverdueItem> overdue = items.stream()
                .filter(i -> i.getStatus() == ItemStatus.PENDING)
                .filter(i -> i.getDayIndex() < dayCap)
                .map(i -> new OverdueItem(i.getId(), i.getTitle(), i.getDayIndex()))
                .toList();

        List<String> bottlenecks = new ArrayList<>();
        if (!overdue.isEmpty()) {
            bottlenecks.add("기한 경과 미완료 항목 " + overdue.size() + "건");
        }
        long pendingDocs = items.stream()
                .filter(i -> i.getStatus() == ItemStatus.PENDING)
                .filter(i -> i.getType().name().equals("DOCUMENT"))
                .count();
        if (pendingDocs > 0) {
            bottlenecks.add("문서 학습 미완료 " + pendingDocs + "건");
        }
        long pendingMeetings = items.stream()
                .filter(i -> i.getStatus() == ItemStatus.PENDING)
                .filter(i -> i.getType().name().equals("PERSON"))
                .count();
        if (pendingMeetings > 0) {
            bottlenecks.add("미팅/버디 항목 미완료 " + pendingMeetings + "건");
        }
        if (bottlenecks.isEmpty()) {
            bottlenecks.add("현재 뚜렷한 병목 없음");
        }

        return new MyProgressResponse(
                plan.getProgressPercent(),
                done,
                total,
                overdue,
                bottlenecks
        );
    }

    private String classifyStatus(BigDecimal progress, int currentDay, OnboardingPlan plan) {
        if (progress.compareTo(BigDecimal.valueOf(90)) >= 0) {
            return "AHEAD";
        }
        // 기대 진행률: (currentDay / 30) * 100 대비 -15% 이하면 AT_RISK
        double expected = (currentDay / 30.0) * 100.0;
        double actual = progress.doubleValue();
        if (actual + 15 < expected) {
            return "AT_RISK";
        }
        return "ON_TRACK";
    }

    private String buildInsights(MyProgressResponse progress, OnboardingPlan plan) {
        if (progress.overdueItems().isEmpty()) {
            return "계획 대비 순조롭게 진행 중입니다. 오늘 할 일 추천을 유지하세요.";
        }
        OverdueItem first = progress.overdueItems().get(0);
        return "기초 학습/체크리스트가 지연되고 있습니다. 우선 '" + first.title()
                + "'(Day " + first.dayIndex() + ")부터 완료를 권장합니다. "
                + "전체 진행률 " + progress.progressPercent() + "%.";
    }
}
