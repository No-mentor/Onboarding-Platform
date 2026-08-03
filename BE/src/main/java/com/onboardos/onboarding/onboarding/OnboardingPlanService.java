package com.onboardos.onboarding.onboarding;

import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import com.onboardos.onboarding.domain.document.DocumentStatus;
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
import com.onboardos.onboarding.domain.template.OnboardingTemplateItem;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import com.onboardos.onboarding.onboarding.dto.GeneratePlanRequest;
import com.onboardos.onboarding.onboarding.dto.PlanItemResponse;
import com.onboardos.onboarding.onboarding.dto.PlanResponse;
import com.onboardos.onboarding.onboarding.dto.RecommendationResponse;
import com.onboardos.onboarding.onboarding.dto.TodayRecommendationsResponse;
import com.onboardos.onboarding.template.TemplateService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OnboardingPlanService {

    private final OnboardingPlanRepository planRepository;
    private final OnboardingPlanItemRepository planItemRepository;
    private final ChecklistItemRepository checklistItemRepository;
    private final DailyRecommendationRepository recommendationRepository;
    private final DocumentRepository documentRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final TemplateService templateService;

    public OnboardingPlanService(
            OnboardingPlanRepository planRepository,
            OnboardingPlanItemRepository planItemRepository,
            ChecklistItemRepository checklistItemRepository,
            DailyRecommendationRepository recommendationRepository,
            DocumentRepository documentRepository,
            WorkspaceAccessService workspaceAccessService,
            @Lazy TemplateService templateService
    ) {
        this.planRepository = planRepository;
        this.planItemRepository = planItemRepository;
        this.checklistItemRepository = checklistItemRepository;
        this.recommendationRepository = recommendationRepository;
        this.documentRepository = documentRepository;
        this.workspaceAccessService = workspaceAccessService;
        this.templateService = templateService;
    }

    @Transactional
    public PlanResponse generate(UserPrincipal principal, UUID workspaceId, GeneratePlanRequest request) {
        workspaceAccessService.requireRoles(workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN);
        UUID targetUserId = request.userId() == null ? principal.getId() : request.userId();
        return generateForUser(workspaceId, targetUserId, request.force(), request.templateId());
    }

    @Transactional
    public PlanResponse generateForUser(UUID workspaceId, UUID userId, boolean force) {
        return generateForUser(workspaceId, userId, force, null);
    }

    @Transactional
    public PlanResponse generateForUser(UUID workspaceId, UUID userId, boolean force, UUID templateId) {
        planRepository.findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNull(workspaceId, userId, "ACTIVE")
                .ifPresent(existing -> {
                    if (!force) {
                        throw new BusinessException(ErrorCode.CONFLICT, "이미 활성 온보딩 계획이 있습니다. force=true로 재생성하세요.");
                    }
                    existing.archive();
                    planRepository.save(existing);
                });

        OnboardingPlan plan = OnboardingPlan.create(workspaceId, userId, LocalDate.now());
        planRepository.save(plan);

        List<DocumentEntity> readyDocs = documentRepository
                .findByWorkspaceIdAndStatusAndDeletedAtIsNull(workspaceId, DocumentStatus.READY);

        List<OnboardingPlanItem> items = buildTemplateItems(plan, readyDocs, templateId);
        planItemRepository.saveAll(items);

        // 체크리스트 동기화
        checklistItemRepository.deleteByWorkspaceIdAndUserId(workspaceId, userId);
        List<ChecklistItem> checklists = items.stream()
                .filter(i -> i.getType() == PlanItemType.CHECKLIST)
                .map(i -> ChecklistItem.create(workspaceId, userId, i.getId(), i.getTitle(), i.getDayIndex()))
                .toList();
        checklistItemRepository.saveAll(checklists);

        return toPlanResponse(plan, items);
    }

    @Transactional(readOnly = true)
    public PlanResponse myPlan(UserPrincipal principal, UUID workspaceId) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());
        OnboardingPlan plan = planRepository
                .findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNull(workspaceId, principal.getId(), "ACTIVE")
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "온보딩 계획이 없습니다."));
        List<OnboardingPlanItem> items = planItemRepository.findByPlanIdOrderByDayIndexAscSortOrderAsc(plan.getId());
        return toPlanResponse(plan, items);
    }

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

    @Transactional
    public PlanResponse regenerate(UserPrincipal principal, UUID workspaceId, UUID planId, boolean keepCompleted) {
        workspaceAccessService.requireRoles(workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN);
        OnboardingPlan existing = planRepository.findByIdAndWorkspaceIdAndDeletedAtIsNull(planId, workspaceId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "계획을 찾을 수 없습니다."));

        // keepCompleted: MVP에서는 완료 항목 제목을 기억한 뒤 재생성 후 복원
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
                    workspaceId, existing.getUserId(), "ACTIVE"
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
            return myPlanForUser(workspaceId, existing.getUserId());
        }
        return regenerated;
    }

    private PlanResponse myPlanForUser(UUID workspaceId, UUID userId) {
        OnboardingPlan plan = planRepository
                .findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNull(workspaceId, userId, "ACTIVE")
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "온보딩 계획이 없습니다."));
        List<OnboardingPlanItem> items = planItemRepository.findByPlanIdOrderByDayIndexAscSortOrderAsc(plan.getId());
        return toPlanResponse(plan, items);
    }

    @Transactional
    public PlanItemResponse updateItemStatus(
            UserPrincipal principal,
            UUID workspaceId,
            UUID itemId,
            ItemStatus status
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

    @Transactional
    public TodayRecommendationsResponse today(UserPrincipal principal, UUID workspaceId, LocalDate date) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());
        LocalDate target = date == null ? LocalDate.now() : date;

        OnboardingPlan plan = planRepository
                .findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNull(workspaceId, principal.getId(), "ACTIVE")
                .orElse(null);

        List<DailyRecommendation> existing = recommendationRepository
                .findByWorkspaceIdAndUserIdAndRecommendDateOrderByPriorityAsc(
                        workspaceId, principal.getId(), target);

        if (existing.isEmpty() && plan != null) {
            long day = ChronoUnit.DAYS.between(plan.getStartDate(), target) + 1;
            int dayIndex = (int) Math.min(30, Math.max(1, day));
            List<OnboardingPlanItem> dayItems = planItemRepository
                    .findByPlanIdAndDayIndexOrderBySortOrderAsc(plan.getId(), dayIndex)
                    .stream()
                    .filter(i -> i.getStatus() != ItemStatus.DONE)
                    .toList();
            List<DailyRecommendation> created = new ArrayList<>();
            int p = 1;
            for (OnboardingPlanItem item : dayItems) {
                created.add(DailyRecommendation.fromPlanItem(
                        workspaceId, principal.getId(), target, item, p++
                ));
            }
            if (created.isEmpty()) {
                OnboardingPlanItem fallback = OnboardingPlanItem.create(
                        plan.getId(), workspaceId, dayIndex, PlanItemType.PRACTICE,
                        "오늘 학습 복습 및 질문 정리", "진행 가능한 항목이 없어 복습을 추천합니다.", 0, null, null
                );
                // 저장하지 않는 가상 추천
                DailyRecommendation r = DailyRecommendation.fromPlanItem(
                        workspaceId, principal.getId(), target, fallback, 1
                );
                recommendationRepository.save(r);
                existing = List.of(r);
            } else {
                recommendationRepository.saveAll(created);
                existing = created;
            }
        }

        return new TodayRecommendationsResponse(
                target,
                existing.stream().map(RecommendationResponse::from).toList()
        );
    }

    @Transactional
    public RecommendationResponse completeRecommendation(
            UserPrincipal principal,
            UUID workspaceId,
            UUID recommendationId
    ) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());
        DailyRecommendation rec = recommendationRepository
                .findByIdAndWorkspaceIdAndUserId(recommendationId, workspaceId, principal.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        rec.markDone();
        if (rec.getPlanItemId() != null) {
            planItemRepository.findById(rec.getPlanItemId()).ifPresent(item -> {
                item.markDone();
                planRepository.findById(item.getPlanId()).ifPresent(this::recalculateProgress);
            });
        }
        return RecommendationResponse.from(rec);
    }

    @Transactional(readOnly = true)
    public List<com.onboardos.onboarding.onboarding.dto.ChecklistResponse> myChecklist(
            UserPrincipal principal,
            UUID workspaceId
    ) {
        workspaceAccessService.requireMembership(workspaceId, principal.getId());
        return checklistItemRepository
                .findByWorkspaceIdAndUserIdAndDeletedAtIsNullOrderByDueDayAsc(workspaceId, principal.getId())
                .stream()
                .map(com.onboardos.onboarding.onboarding.dto.ChecklistResponse::from)
                .toList();
    }

    @Transactional
    public com.onboardos.onboarding.onboarding.dto.ChecklistResponse updateChecklist(
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
        return com.onboardos.onboarding.onboarding.dto.ChecklistResponse.from(item);
    }

    private void recalculateProgress(OnboardingPlan plan) {
        long total = planItemRepository.countByPlanIdAndStatusNot(plan.getId(), ItemStatus.SKIPPED);
        long done = planItemRepository.countByPlanIdAndStatus(plan.getId(), ItemStatus.DONE);
        BigDecimal percent = total == 0
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(done * 100.0 / total).setScale(2, RoundingMode.HALF_UP);
        plan.updateProgress(percent);
    }

    private List<OnboardingPlanItem> buildTemplateItems(
            OnboardingPlan plan,
            List<DocumentEntity> docs,
            UUID templateId
    ) {
        List<OnboardingTemplateItem> custom = templateService.loadItemsForPlan(plan.getWorkspaceId(), templateId);
        if (!custom.isEmpty()) {
            List<OnboardingPlanItem> fromTemplate = new ArrayList<>();
            for (OnboardingTemplateItem ti : custom) {
                fromTemplate.add(OnboardingPlanItem.create(
                        plan.getId(),
                        plan.getWorkspaceId(),
                        ti.getDayIndex(),
                        ti.getType(),
                        ti.getTitle(),
                        ti.getDescription(),
                        ti.getSortOrder(),
                        null,
                        null
                ));
            }
            // READY 문서를 추가 학습 항목으로 보완
            int day = 2;
            for (DocumentEntity doc : docs) {
                if (day > 10) {
                    break;
                }
                fromTemplate.add(OnboardingPlanItem.create(
                        plan.getId(), plan.getWorkspaceId(), day, PlanItemType.DOCUMENT,
                        "문서 읽기: " + doc.getTitle(), "회사 지식 문서 학습", 99, doc.getId(), null
                ));
                day++;
            }
            return fromTemplate;
        }

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
            if (day > 14) {
                break;
            }
            items.add(OnboardingPlanItem.create(
                    plan.getId(), plan.getWorkspaceId(), day, PlanItemType.DOCUMENT,
                    "문서 읽기: " + doc.getTitle(),
                    "회사 지식 문서 학습",
                    0,
                    doc.getId(),
                    null
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
                plan.getStatus(),
                plan.getVersion(),
                plan.getStartDate(),
                plan.getEndDate(),
                plan.getProgressPercent(),
                items.stream().map(PlanItemResponse::from).toList()
        );
    }
}
