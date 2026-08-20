package com.onboardos.onboarding.onboarding;

import com.onboardos.onboarding.global.security.SecurityUtils;
import com.onboardos.onboarding.onboarding.dto.ChecklistResponse;
import com.onboardos.onboarding.onboarding.dto.ChecklistStatusFilter;
import com.onboardos.onboarding.onboarding.dto.ChecklistSummaryResponse;
import com.onboardos.onboarding.onboarding.dto.GeneratePlanRequest;
import com.onboardos.onboarding.onboarding.dto.PlanItemResponse;
import com.onboardos.onboarding.onboarding.dto.PlanResponse;
import com.onboardos.onboarding.onboarding.dto.RecommendationResponse;
import com.onboardos.onboarding.onboarding.dto.RegeneratePlanRequest;
import com.onboardos.onboarding.onboarding.dto.StatusUpdateRequest;
import com.onboardos.onboarding.onboarding.dto.TodayRecommendationsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Onboarding")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class OnboardingController {

    private final OnboardingPlanService planService;
    private final RecommendationService recommendationService;
    private final ChecklistService checklistService;

    // ===== Onboarding Plans =====

    @Operation(summary = "30일 온보딩 계획 생성")
    @PostMapping("/onboarding-plans/generate")
    @ResponseStatus(HttpStatus.CREATED)
    public PlanResponse generate(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @RequestBody(required = false) GeneratePlanRequest request
    ) {
        GeneratePlanRequest body = request == null ? new GeneratePlanRequest(null, null, false) : request;
        return planService.generate(SecurityUtils.currentUser(), workspaceId, body);
    }

    @Operation(summary = "내 온보딩 계획")
    @GetMapping("/onboarding-plans/me")
    public PlanResponse myPlan(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @RequestParam(defaultValue = "true") boolean includeItems
    ) {
        return planService.myPlan(SecurityUtils.currentUser(), workspaceId, includeItems);
    }

    @Operation(summary = "계획 상세")
    @GetMapping("/onboarding-plans/{planId}")
    public PlanResponse getPlan(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @PathVariable UUID planId
    ) {
        return planService.getPlan(SecurityUtils.currentUser(), workspaceId, planId);
    }

    @Operation(summary = "계획 재생성 (Admin)")
    @PostMapping("/onboarding-plans/{planId}/regenerate")
    public PlanResponse regenerate(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @PathVariable UUID planId,
            @RequestParam(defaultValue = "true") boolean keepCompleted,
            @RequestBody(required = false) RegeneratePlanRequest request
    ) {
        boolean preserve = request != null && request.preserveCompleted() != null
                ? request.preserveCompleted() : keepCompleted;
        return planService.regenerate(SecurityUtils.currentUser(), workspaceId, planId, preserve,
                request == null ? null : request.templateId());
    }

    @Operation(summary = "계획 항목 상태 변경")
    @PatchMapping("/onboarding-plans/items/{itemId}")
    public PlanItemResponse updateItem(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @PathVariable UUID itemId,
            @Valid @RequestBody StatusUpdateRequest request
    ) {
        return planService.updateItemStatus(
                SecurityUtils.currentUser(), workspaceId, itemId, request.status()
        );
    }

    // ===== Recommendations =====

    @Operation(summary = "오늘 할 일 추천")
    @GetMapping("/recommendations/today")
    public TodayRecommendationsResponse today(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return recommendationService.today(SecurityUtils.currentUser(), workspaceId, date);
    }

    @Operation(summary = "추천 항목 완료")
    @PostMapping("/recommendations/{recommendationId}/complete")
    public RecommendationResponse completeRecommendation(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @PathVariable UUID recommendationId
    ) {
        return recommendationService.complete(SecurityUtils.currentUser(), workspaceId, recommendationId);
    }

    @Operation(summary = "추천 항목 건너뛰기(dismiss)")
    @PostMapping("/recommendations/{recommendationId}/dismiss")
    public RecommendationResponse dismissRecommendation(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @PathVariable UUID recommendationId
    ) {
        return recommendationService.dismiss(SecurityUtils.currentUser(), workspaceId, recommendationId);
    }

    // ===== Checklists =====

    @Operation(summary = "내 체크리스트")
    @GetMapping("/checklists/me")
    public ChecklistSummaryResponse checklist(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @RequestParam(defaultValue = "ALL") ChecklistStatusFilter status
    ) {
        List<ChecklistResponse> items = checklistService.myChecklist(
                SecurityUtils.currentUser(), workspaceId, status
        );
        return ChecklistSummaryResponse.from(items);
    }

    @Operation(summary = "체크리스트 항목 갱신")
    @PatchMapping("/checklists/items/{itemId}")
    public ChecklistResponse updateChecklist(
            @RequestHeader("X-Workspace-Id") UUID workspaceId,
            @PathVariable UUID itemId,
            @Valid @RequestBody StatusUpdateRequest request
    ) {
        return checklistService.updateChecklist(
                SecurityUtils.currentUser(), workspaceId, itemId, request.status()
        );
    }
}
