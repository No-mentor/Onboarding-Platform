package com.onboardos.onboarding.onboarding;

import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import com.onboardos.onboarding.domain.document.DocumentStatus;
import com.onboardos.onboarding.domain.plan.ChecklistItem;
import com.onboardos.onboarding.domain.plan.ChecklistItemRepository;
import com.onboardos.onboarding.domain.plan.ItemStatus;
import com.onboardos.onboarding.domain.plan.OnboardingPlan;
import com.onboardos.onboarding.domain.plan.OnboardingPlanItem;
import com.onboardos.onboarding.domain.plan.OnboardingPlanItemRepository;
import com.onboardos.onboarding.domain.plan.OnboardingPlanRepository;
import com.onboardos.onboarding.domain.plan.PlanItemType;
import com.onboardos.onboarding.domain.plan.PlanStatus;
import com.onboardos.onboarding.domain.template.OnboardingTemplateItem;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import com.onboardos.onboarding.onboarding.dto.GeneratePlanRequest;
import com.onboardos.onboarding.onboarding.dto.PlanItemResponse;
import com.onboardos.onboarding.onboarding.dto.PlanResponse;
import com.onboardos.onboarding.template.TemplateService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 온보딩 계획(Plan) 도메인 서비스.
 * 30일 계획 생성, 조회, 재생성, 항목 상태 변경을 담당한다.
 */
@Service
public class OnboardingPlanService {

    private final OnboardingPlanRepository planRepository;
    private final OnboardingPlanItemRepository planItemRepository;
    private final ChecklistItemRepository checklistItemRepository;
    private final DocumentRepository documentRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final TemplateService templateService;

    public OnboardingPlanService(
            OnboardingPlanRepository planRepository,
            OnboardingPlanItemRepository planItemRepository,
            ChecklistItemRepository checklistItemRepository,
            DocumentRepository documentRepository,
            WorkspaceAccessService workspaceAccessService,
            @Lazy TemplateService templateService
    ) {
        this.planRepository = planRepository;
        this.planItemRepository = planItemRepository;
        this.checklistItemRepository = checklistItemRepository;
        this.documentRepository = documentRepository;
        this.workspaceAccessService = workspaceAccessService;
        this.templateService = templateService;
    }

    /**
     * Admin/Owner가 대상 사용자의 30일 계획을 생성한다.
     */
    @Transactional
    public PlanResponse generate(UserPrincipal principal, UUID workspaceId, GeneratePlanRequest request) {
        workspaceAccessService.requireRoles(workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN);
        UUID targetUserId = request.userId() == null ? principal.getId() : request.userId();
        return generateForUser(workspaceId, targetUserId, request.force(), request.templateId());
    }

    /**
     * 특정 사용자에 대해 계획을 생성한다 (초대 수락 시 시스템 트리거 등에서 사용).
     */
    @Transactional
    public PlanResponse generateForUser(UUID workspaceId, UUID userId, boolean force) {
        return generateForUser(workspaceId, userId, force, null);
    }

    @Transactional
    public PlanResponse generateForUser(UUID workspaceId, UUID userId, boolean force, UUID templateId) {
        planRepository.findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNull(workspaceId, userId, PlanStatus.ACTIVE)
                .ifPresent(existing -> {
                    if (!force) {
                        throw new BusinessException(ErrorCode.CONFLICT, "이미 활성 온보딩 계획이 있습니다. force=true로 재생성하세요.");
                    }
                    existing.archive();
                    planRepository.saveAndFlush(existing);
                });

        OnboardingPlan plan = OnboardingPlan.create(workspaceId, userId, LocalDate.now(), templateId);
        planRepository.save(plan);

        List<DocumentEntity> readyDocs = documentRepository
                .findByWorkspaceIdAndStatusAndDeletedAtIsNull(workspaceId, DocumentStatus.READY);

        List<OnboardingPlanItem> items = buildPlanItems(plan, readyDocs, templateId);
        planItemRepository.saveAll(items);

        // 기존 체크리스트 soft delete 후 새로 생성
        softDeleteExistingChecklists(workspaceId, userId);
        List<ChecklistItem> checklists = items.stream()
                .filter(i -> i.getType() == PlanItemType.CHECKLIST)
                .map(i -> ChecklistItem.create(workspaceId, userId, i.getId(), i.getTitle(), i.getDayIndex()))
                .toList();
        checklistItemRepository.saveAll(checklists);

        return toPlanResponse(plan, items);
    }

    /**
     * 내 활성 온보딩 계획 조회.
     */
    @Transactional(readOnly = true)
    public PlanResponse myPlan(UserPrincipal principal, UUID workspaceId, boolean includeItems) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());
        OnboardingPlan plan = planRepository
                .findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNull(workspaceId, principal.getId(), PlanStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "온보딩 계획이 없습니다."));
        List<OnboardingPlanItem> items = includeItems
                ? planItemRepository.findByPlanIdOrderByDayIndexAscSortOrderAsc(plan.getId())
                : List.of();
        return toPlanResponse(plan, items);
    }

    /**
     * 특정 계획 상세 조회. 본인 또는 Admin/Manager 이상만 조회 가능.
     */
    @Transactional(readOnly = true)
    public PlanResponse getPlan(UserPrincipal principal, UUID workspaceId, UUID planId) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());
        OnboardingPlan plan = planRepository.findByIdAndWorkspaceIdAndDeletedAtIsNull(planId, workspaceId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "계획을 찾을 수 없습니다."));
        if (!plan.getUserId().equals(principal.getId())) {
            workspaceAccessService.requireRoles(
                    workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER
            );
        }
        List<OnboardingPlanItem> items = planItemRepository.findByPlanIdOrderByDayIndexAscSortOrderAsc(plan.getId());
        return toPlanResponse(plan, items);
    }

    /**
     * 기존 계획을 새 버전으로 재생성한다. 완료된 항목 보존 옵션 지원.
     */
    @Transactional
    public PlanResponse regenerate(UserPrincipal principal, UUID workspaceId, UUID planId, boolean keepCompleted) {
        workspaceAccessService.requireRoles(workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN);
        OnboardingPlan existing = planRepository.findByIdAndWorkspaceIdAndDeletedAtIsNull(planId, workspaceId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "계획을 찾을 수 없습니다."));

        final List<String> completedTitles = keepCompleted
                ? planItemRepository.findByPlanIdOrderByDayIndexAscSortOrderAsc(existing.getId())
                .stream()
                .filter(i -> i.getStatus() == ItemStatus.DONE)
                .map(OnboardingPlanItem::getTitle)
                .toList()
                : List.of();

        PlanResponse regenerated = generateForUser(workspaceId, existing.getUserId(), true);

        if (!completedTitles.isEmpty()) {
            planRepository.findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNull(
                    workspaceId, existing.getUserId(), PlanStatus.ACTIVE
            ).ifPresent(newPlan -> {
                List<OnboardingPlanItem> newItems =
                        planItemRepository.findByPlanIdOrderByDayIndexAscSortOrderAsc(newPlan.getId());
                for (OnboardingPlanItem item : newItems) {
                    if (completedTitles.contains(item.getTitle())) {
                        item.markDone();
                    }
                }
                recalculateProgress(newPlan);
            });
            return getPlanForUser(workspaceId, existing.getUserId());
        }
        return regenerated;
    }

    /**
     * 계획 항목 상태를 변경한다 (DONE/PENDING).
     */
    @Transactional
    public PlanItemResponse updateItemStatus(
            UserPrincipal principal, UUID workspaceId, UUID itemId, ItemStatus status
    ) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());
        OnboardingPlanItem item = planItemRepository.findByIdAndWorkspaceId(itemId, workspaceId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "계획 항목이 없습니다."));

        OnboardingPlan plan = planRepository.findById(item.getPlanId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        if (!plan.getUserId().equals(principal.getId())) {
            workspaceAccessService.requireRoles(workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN);
        }

        if (status == ItemStatus.DONE) {
            item.markDone();
        } else {
            item.markPending();
        }
        recalculateProgress(plan);
        return PlanItemResponse.from(item);
    }

    // --- package-private helpers (used by DashboardService etc.) ---

    PlanResponse getPlanForUser(UUID workspaceId, UUID userId) {
        OnboardingPlan plan = planRepository
                .findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNull(workspaceId, userId, PlanStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "온보딩 계획이 없습니다."));
        List<OnboardingPlanItem> items = planItemRepository.findByPlanIdOrderByDayIndexAscSortOrderAsc(plan.getId());
        return toPlanResponse(plan, items);
    }

    void recalculateProgress(OnboardingPlan plan) {
        long total = planItemRepository.countByPlanIdAndStatusNot(plan.getId(), ItemStatus.SKIPPED);
        long done = planItemRepository.countByPlanIdAndStatus(plan.getId(), ItemStatus.DONE);
        BigDecimal percent = total == 0
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(done * 100.0 / total).setScale(2, RoundingMode.HALF_UP);
        plan.updateProgress(percent);
    }

    // --- private methods ---

    private void softDeleteExistingChecklists(UUID workspaceId, UUID userId) {
        List<ChecklistItem> existing = checklistItemRepository
                .findByWorkspaceIdAndUserIdAndDeletedAtIsNullOrderByDueDayAsc(workspaceId, userId);
        for (ChecklistItem c : existing) {
            c.softDelete();
        }
    }

    private List<OnboardingPlanItem> buildPlanItems(
            OnboardingPlan plan, List<DocumentEntity> docs, UUID templateId
    ) {
        List<OnboardingTemplateItem> custom = templateService.loadItemsForPlan(plan.getWorkspaceId(), templateId);
        if (!custom.isEmpty()) {
            return buildFromTemplate(plan, custom, docs);
        }
        return buildDefaultItems(plan, docs);
    }

    private List<OnboardingPlanItem> buildFromTemplate(
            OnboardingPlan plan, List<OnboardingTemplateItem> templateItems, List<DocumentEntity> docs
    ) {
        List<OnboardingPlanItem> items = new ArrayList<>();
        for (OnboardingTemplateItem ti : templateItems) {
            items.add(OnboardingPlanItem.create(
                    plan.getId(), plan.getWorkspaceId(),
                    ti.getDayIndex(), ti.getType(), ti.getTitle(), ti.getDescription(),
                    ti.getSortOrder(), null, null
            ));
        }
        // READY 문서를 추가 학습 항목으로 보완
        int day = 2;
        for (DocumentEntity doc : docs) {
            if (day > 10) break;
            items.add(OnboardingPlanItem.create(
                    plan.getId(), plan.getWorkspaceId(), day, PlanItemType.DOCUMENT,
                    "문서 읽기: " + doc.getTitle(), "회사 지식 문서 학습", 99, doc.getId(), null
            ));
            day++;
        }
        return items;
    }

    private List<OnboardingPlanItem> buildDefaultItems(OnboardingPlan plan, List<DocumentEntity> docs) {
        List<OnboardingPlanItem> items = new ArrayList<>();
        int sort = 0;

        items.add(OnboardingPlanItem.create(
                plan.getId(), plan.getWorkspaceId(), 1, PlanItemType.CHECKLIST,
                "계정 및 도구 접근 확인", "메일·슬랙·저장소 접근 가능 여부 확인", sort++, null, null
        ));
        items.add(OnboardingPlanItem.create(
                plan.getId(), plan.getWorkspaceId(), 1, PlanItemType.PERSON,
                "Buddy 인사 미팅", "온보딩 버디와 첫 미팅", sort++, null, "Buddy"
        ));
        items.add(OnboardingPlanItem.create(
                plan.getId(), plan.getWorkspaceId(), 1, PlanItemType.PRACTICE,
                "로컬 개발환경 세팅", "저장소 클론 및 실행 확인", sort++, null, null
        ));

        int day = 2;
        for (DocumentEntity doc : docs) {
            if (day > 14) break;
            items.add(OnboardingPlanItem.create(
                    plan.getId(), plan.getWorkspaceId(), day, PlanItemType.DOCUMENT,
                    "문서 읽기: " + doc.getTitle(), "회사 지식 문서 학습", 0, doc.getId(), null
            ));
            day++;
        }

        if (docs.isEmpty()) {
            items.add(OnboardingPlanItem.create(
                    plan.getId(), plan.getWorkspaceId(), 2, PlanItemType.DOCUMENT,
                    "문서 업로드 대기", "관리자가 문서를 업로드하면 학습 항목이 확장됩니다.", 0, null, null
            ));
        }

        items.add(OnboardingPlanItem.create(
                plan.getId(), plan.getWorkspaceId(), 7, PlanItemType.CHECKLIST,
                "첫 주 회고 작성", "배운 점 / 막힌 점 정리", 0, null, null
        ));
        items.add(OnboardingPlanItem.create(
                plan.getId(), plan.getWorkspaceId(), 30, PlanItemType.PRACTICE,
                "30일 첫 독립 업무 도전", "TTP 측정용 첫 업무 완수 기록", 0, null, null
        ));
        return items;
    }

    private PlanResponse toPlanResponse(OnboardingPlan plan, List<OnboardingPlanItem> items) {
        return new PlanResponse(
                plan.getId(),
                plan.getUserId(),
                plan.getStatus(),
                plan.getVersion(),
                plan.getStartDate(),
                plan.getEndDate(),
                plan.getProgressPercent(),
                items.size(),
                items.stream().map(PlanItemResponse::from).toList()
        );
    }
}
