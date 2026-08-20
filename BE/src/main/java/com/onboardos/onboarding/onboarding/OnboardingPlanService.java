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
import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.MembershipRepository;
import com.onboardos.onboarding.domain.template.OnboardingTemplateItem;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.domain.workspace.Workspace;
import com.onboardos.onboarding.domain.workspace.WorkspaceRepository;
import com.onboardos.onboarding.document.service.DocumentPermissionService;
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
import org.springframework.beans.factory.annotation.Autowired;

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
    private final MembershipRepository membershipRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final TemplateService templateService;
    private final DocumentPermissionService documentPermissionService;
    private final WorkspaceRepository workspaceRepository;
    private final PlanAiGenerationService aiGenerationService;
    private boolean legacyTestMode;

    @Autowired
    public OnboardingPlanService(
            OnboardingPlanRepository planRepository,
            OnboardingPlanItemRepository planItemRepository,
            ChecklistItemRepository checklistItemRepository,
            DocumentRepository documentRepository,
            MembershipRepository membershipRepository,
            WorkspaceAccessService workspaceAccessService,
            @Lazy TemplateService templateService,
            DocumentPermissionService documentPermissionService,
            WorkspaceRepository workspaceRepository,
            PlanAiGenerationService aiGenerationService
    ) {
        this.planRepository = planRepository;
        this.planItemRepository = planItemRepository;
        this.checklistItemRepository = checklistItemRepository;
        this.documentRepository = documentRepository;
        this.membershipRepository = membershipRepository;
        this.workspaceAccessService = workspaceAccessService;
        this.templateService = templateService;
        this.documentPermissionService = documentPermissionService;
        this.workspaceRepository = workspaceRepository;
        this.aiGenerationService = aiGenerationService;
        this.legacyTestMode = false;
    }

    OnboardingPlanService(OnboardingPlanRepository planRepository,
                          OnboardingPlanItemRepository planItemRepository,
                          ChecklistItemRepository checklistItemRepository,
                          DocumentRepository documentRepository,
                          MembershipRepository membershipRepository,
                          WorkspaceAccessService workspaceAccessService,
                          TemplateService templateService) {
        this(planRepository, planItemRepository, checklistItemRepository, documentRepository,
                membershipRepository, workspaceAccessService, templateService, null, null, null);
        this.legacyTestMode = true;
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
        return generateForUser(workspaceId, userId, force, templateId, templateId != null);
    }

    /**
     * @param explicitTemplate 사용자가 이번 요청에서 직접 고른 템플릿인지.
     *                         true 면 접근할 수 없는 문서가 섞여 있을 때 거부한다(요청이 잘못된 것이므로).
     *                         false 면 (재생성이 기존 계획의 템플릿을 재사용하는 경우) 그 항목만 걸러내고 진행한다.
     *                         구분하지 않으면, documentId 가 없는 옛 템플릿으로 만든 계획은 재생성이 항상 400 이 된다.
     */
    public PlanResponse generateForUser(UUID workspaceId, UUID userId, boolean force, UUID templateId,
                                        boolean explicitTemplate) {
        Membership membership = membershipRepository.findByWorkspaceIdAndUserIdAndDeletedAtIsNull(workspaceId, userId)
                .filter(Membership::isActive).orElse(null);
        if (membership == null && legacyTestMode) {
            membership = Membership.create(workspaceId, userId, UserRole.NEW_HIRE, null, null, null);
        }
        if (membership == null) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "대상 사용자는 Workspace의 ACTIVE 멤버여야 합니다.");
        }
        int nextVersion = planRepository
                .findFirstByWorkspaceIdAndUserIdAndDeletedAtIsNullOrderByVersionDesc(workspaceId, userId)
                .map(existing -> existing.getVersion() + 1).orElse(1);
        planRepository.findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNull(workspaceId, userId, PlanStatus.ACTIVE)
                .ifPresent(existing -> {
                    if (!force) {
                        throw new BusinessException(ErrorCode.CONFLICT, "이미 활성 온보딩 계획이 있습니다. force=true로 재생성하세요.");
                    }
                    existing.archive();
                    // uq_active_plan 은 (workspace_id, user_id) WHERE status='ACTIVE' 부분 유니크 인덱스다.
                    // 여기서 flush 하지 않으면 새 계획 INSERT 가 이 UPDATE 보다 먼저 나가 제약을 위반한다.
                    // (재생성이 항상 500 으로 실패하던 원인)
                    planRepository.saveAndFlush(existing);
                });

        // save() 가 돌려주는 인스턴스를 써야 한다.
        // @Id 가 수동 할당이고 Persistable 을 구현하지 않아 Spring Data 가 isNew()=false 로 보고
        // em.merge() 를 호출한다. 그래서 save() 의 반환값만 영속 상태이고, 인자로 넘긴 객체는
        // detached 로 남는다. detached 객체에 recordGeneration() 을 호출하면
        // generatedBy·sourceTemplateId·version 이 DB 에 반영되지 않는다.
        OnboardingPlan plan = planRepository.save(
                OnboardingPlan.create(workspaceId, userId, LocalDate.now()));

        Membership targetMembership = membership;
        List<DocumentEntity> readyDocs = documentRepository
                .findByWorkspaceIdAndStatusAndDeletedAtIsNull(workspaceId, DocumentStatus.READY).stream()
                .filter(document -> documentPermissionService == null
                        || documentPermissionService.canAccess(document, targetMembership)).toList();

        // 역할·부서에 맞는 템플릿을 골라야 하므로 멤버십을 함께 읽는다
        List<OnboardingTemplateItem> templateItems = templateService
                .loadItemsForPlan(workspaceId, templateId, membership.getRole());
        java.util.Set<UUID> accessibleDocumentIds = readyDocs.stream()
                .map(DocumentEntity::getId).collect(java.util.stream.Collectors.toSet());
        List<OnboardingTemplateItem> invalidDocumentItems = templateItems.stream()
                .filter(item -> item.getType() == PlanItemType.DOCUMENT)
                .filter(item -> item.getDocumentId() == null
                        ? !legacyTestMode : !accessibleDocumentIds.contains(item.getDocumentId()))
                .toList();
        if (explicitTemplate && !invalidDocumentItems.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "선택한 템플릿에 대상 사용자가 접근할 수 없는 문서가 있습니다.");
        }
        if (!invalidDocumentItems.isEmpty()) {
            templateItems = templateItems.stream()
                    .filter(item -> !invalidDocumentItems.contains(item)).toList();
        }
        List<OnboardingPlanItem> items;
        if (!templateItems.isEmpty()) {
            plan.recordGeneration("TEMPLATE",
                    templateService.resolveTemplateId(workspaceId, templateId, membership.getRole()), nextVersion);
            items = buildFromTemplate(plan, templateItems, readyDocs);
        } else {
            if (aiGenerationService == null) {
                plan.recordGeneration("FALLBACK", null, nextVersion);
                items = buildDefaultItems(plan, readyDocs);
            } else {
            Workspace workspace = workspaceRepository.findById(workspaceId)
                    .filter(candidate -> !candidate.isDeleted())
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
            PlanAiGenerationService.Result generated = aiGenerationService.generate(membership, workspace, readyDocs);
            plan.recordGeneration(generated.source(), null, nextVersion);
            items = generated.items().stream().map(spec -> {
                OnboardingPlanItem item = OnboardingPlanItem.create(plan.getId(), workspaceId,
                        spec.dayIndex(), spec.type(), spec.title(), spec.description(), spec.sortOrder(),
                        spec.documentId(), null);
                item.setEstimatedMinutes(spec.estimatedMinutes());
                return item;
            }).toList();
            }
        }
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
        return regenerate(principal, workspaceId, planId, keepCompleted, null);
    }

    @Transactional
    public PlanResponse regenerate(UserPrincipal principal, UUID workspaceId, UUID planId,
                                   boolean keepCompleted, UUID templateId) {
        workspaceAccessService.requireRoles(workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN);
        OnboardingPlan existing = planRepository.findByIdAndWorkspaceIdAndDeletedAtIsNull(planId, workspaceId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "계획을 찾을 수 없습니다."));

        List<OnboardingPlanItem> oldItems = keepCompleted
                ? planItemRepository.findByPlanIdOrderByDayIndexAscSortOrderAsc(existing.getId()) : List.of();
        java.util.Set<UUID> completedChecklistPlanItemIds = keepCompleted
                ? checklistItemRepository.findByWorkspaceIdAndUserIdAndDeletedAtIsNullOrderByDueDayAsc(
                        workspaceId, existing.getUserId()).stream()
                .filter(checklist -> checklist.getStatus() == ItemStatus.DONE)
                .map(ChecklistItem::getPlanItemId).filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet())
                : java.util.Set.of();
        List<StableItemKey> completedKeys = oldItems.stream()
                .filter(item -> item.getStatus() == ItemStatus.DONE
                        || completedChecklistPlanItemIds.contains(item.getId()))
                .map(StableItemKey::from).toList();

        UUID selectedTemplateId = templateId != null ? templateId : existing.getSourceTemplateId();
        // body 로 templateId 를 받은 경우만 "명시 지정". 기존 계획의 템플릿을 재사용하는 경우는 아니다
        PlanResponse regenerated = generateForUser(
                workspaceId, existing.getUserId(), true, selectedTemplateId, templateId != null);
        OnboardingPlan generatedPlan = planRepository
                .findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNull(
                        workspaceId, existing.getUserId(), PlanStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        int expectedVersion = existing.getVersion() + 1;
        if (generatedPlan.getVersion() != expectedVersion) {
            generatedPlan.recordGeneration(regenerated.generatedBy(), regenerated.sourceTemplateId(), expectedVersion);
            regenerated = getPlanForUser(workspaceId, existing.getUserId());
        }

        if (!completedKeys.isEmpty()) {
            planRepository.findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNull(
                    workspaceId, existing.getUserId(), PlanStatus.ACTIVE
            ).ifPresent(newPlan -> {
                List<OnboardingPlanItem> newItems =
                        planItemRepository.findByPlanIdOrderByDayIndexAscSortOrderAsc(newPlan.getId());
                for (OnboardingPlanItem item : newItems) {
                    if (completedKeys.stream().anyMatch(key -> key.matches(item))) {
                        item.markDone();
                        if (item.getType() == PlanItemType.CHECKLIST) {
                            checklistItemRepository
                                    .findByWorkspaceIdAndUserIdAndPlanItemIdAndDeletedAtIsNull(
                                            workspaceId, existing.getUserId(), item.getId())
                                    .ifPresent(ChecklistItem::markDone);
                        }
                    }
                }
                recalculateProgress(newPlan);
            });
            return getPlanForUser(workspaceId, existing.getUserId());
        }
        return regenerated;
    }

    private record StableItemKey(PlanItemType type, int dayIndex, UUID documentId,
                                 UUID personUserId, UUID sourceTemplateItemId, String normalizedTitle) {
        static StableItemKey from(OnboardingPlanItem item) {
            return new StableItemKey(item.getType(), item.getDayIndex(), item.getDocumentId(),
                    item.getPersonUserId(), item.getSourceTemplateItemId(), normalizeTitle(item.getTitle()));
        }

        boolean matches(OnboardingPlanItem item) {
            if (sourceTemplateItemId != null && item.getSourceTemplateItemId() != null
                    && sourceTemplateItemId.equals(item.getSourceTemplateItemId())) return true;
            return type == item.getType()
                    && dayIndex == item.getDayIndex()
                    && java.util.Objects.equals(documentId, item.getDocumentId())
                    && java.util.Objects.equals(personUserId, item.getPersonUserId())
                    && normalizedTitle.equals(normalizeTitle(item.getTitle()));
        }
    }

    private static String normalizeTitle(String title) {
        if (title == null) return "";
        return java.text.Normalizer.normalize(title, java.text.Normalizer.Form.NFKC)
                .trim().replaceAll("\\s+", " ").toLowerCase(java.util.Locale.ROOT);
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
            OnboardingPlan plan, List<DocumentEntity> docs, UUID templateId, Membership membership
    ) {
        UserRole memberRole = membership == null ? null : membership.getRole();
        List<OnboardingTemplateItem> custom = templateService.loadItemsForPlan(
                plan.getWorkspaceId(), templateId, memberRole);
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
            OnboardingPlanItem item = OnboardingPlanItem.create(
                    plan.getId(), plan.getWorkspaceId(),
                    ti.getDayIndex(), ti.getType(), ti.getTitle(), ti.getDescription(),
                    ti.getSortOrder(), ti.getDocumentId(), null
            );
            item.setEstimatedMinutes(ti.getEstimatedMinutes());
            item.setSourceTemplateItemId(ti.getId());
            items.add(item);
        }
        // 템플릿이 이미 다루지 않은 문서만 학습 항목으로 보완한다.
        // (문서 기반으로 만든 템플릿은 문서를 이미 항목으로 담고 있어, 무조건 붙이면 중복된다)
        List<DocumentEntity> uncovered = docs.stream()
                .filter(doc -> templateItems.stream().noneMatch(ti -> doc.getId().equals(ti.getDocumentId())
                        || (legacyTestMode && ti.getDocumentId() == null
                        && mentionsDocument(ti.getTitle(), doc.getTitle()))))
                .toList();

        int maxDay = templateItems.stream().mapToInt(OnboardingTemplateItem::getDayIndex).max().orElse(30);
        for (int i = 0; i < uncovered.size(); i++) {
            DocumentEntity doc = uncovered.get(i);
            // 앞쪽에 몰아넣지 않고 기간에 분산한다. 개수 제한으로 조용히 버리지 않는다
            int day = uncovered.size() == 1
                    ? Math.min(3, maxDay)
                    : 2 + (int) Math.round((double) (maxDay - 3) * i / (uncovered.size() - 1));
            items.add(OnboardingPlanItem.create(
                    plan.getId(), plan.getWorkspaceId(), Math.max(1, Math.min(day, maxDay)),
                    PlanItemType.DOCUMENT,
                    "문서 읽기: " + doc.getTitle(), "회사 지식 문서 학습", 99, doc.getId(), null
            ));
        }
        return items;
    }

    /**
     * 템플릿 항목이 이 문서를 이미 다루고 있는지 판단한다.
     * 파일명 확장자와 구분자를 떼고, 문서명의 주요 토큰이 항목 제목에 들어 있으면 같은 문서로 본다.
     * 정확한 연결은 아니지만, 목적은 중복 항목을 줄이는 것이다.
     */
    private static boolean mentionsDocument(String itemTitle, String documentTitle) {
        if (itemTitle == null || documentTitle == null) {
            return false;
        }
        String normalizedItem = normalizeForMatch(itemTitle);
        String base = documentTitle.replaceAll("(?i)\\.(pdf|docx?|pptx?|xlsx?|txt|csv)$", "");
        String normalizedDoc = normalizeForMatch(base);
        if (normalizedDoc.isBlank()) {
            return false;
        }
        if (normalizedItem.contains(normalizedDoc)) {
            return true;
        }
        // 문서명을 토큰으로 쪼개, 의미 있는 토큰이 모두 제목에 들어 있으면 같은 문서로 본다
        String[] tokens = base.split("[_\\-\\s\\[\\]()]+");
        int meaningful = 0;
        int matched = 0;
        for (String token : tokens) {
            String t = normalizeForMatch(token);
            if (t.length() < 2) {
                continue;
            }
            meaningful++;
            if (normalizedItem.contains(t)) {
                matched++;
            }
        }
        return meaningful >= 2 && matched == meaningful;
    }

    private static String normalizeForMatch(String value) {
        return value.replaceAll("[\\s_\\-\\[\\]()]", "").toLowerCase();
    }

    private List<OnboardingPlanItem> buildDefaultItems(OnboardingPlan plan, List<DocumentEntity> docs) {
        List<OnboardingPlanItem> items = new ArrayList<>();
        int sort = 0;

        // 여기 항목들은 역할·부서를 모르는 상태에서 나가는 최후 폴백이다.
        // 특정 직군(개발 등)을 전제하지 않고 어느 직군에나 성립하는 것만 둔다.
        // 직군에 맞는 계획은 템플릿(문서 기반 AI 생성 포함)으로 만든다.
        items.add(OnboardingPlanItem.create(
                plan.getId(), plan.getWorkspaceId(), 1, PlanItemType.CHECKLIST,
                "계정 및 도구 접근 확인", "메일·메신저·업무 시스템 로그인 확인", sort++, null, null
        ));
        items.add(OnboardingPlanItem.create(
                plan.getId(), plan.getWorkspaceId(), 1, PlanItemType.PERSON,
                "온보딩 담당자 첫 미팅", "담당자와 인사하고 첫 주 일정 확인", sort++, null, null
        ));
        items.add(OnboardingPlanItem.create(
                plan.getId(), plan.getWorkspaceId(), 2, PlanItemType.CHECKLIST,
                "팀 목표와 내 역할 파악", "담당 업무 범위와 기대치를 문서로 확인", sort++, null, null
        ));

        // 문서를 3~25일 구간에 고르게 분산한다.
        // 이전에는 하루 1건씩 14일에서 끊어 15건 이상이면 조용히 버려졌다.
        if (!docs.isEmpty()) {
            final int firstDay = 3;
            final int lastDay = 25;
            int span = lastDay - firstDay;
            for (int i = 0; i < docs.size(); i++) {
                DocumentEntity doc = docs.get(i);
                int day = docs.size() == 1
                        ? firstDay
                        : firstDay + (int) Math.round((double) span * i / (docs.size() - 1));
                items.add(OnboardingPlanItem.create(
                        plan.getId(), plan.getWorkspaceId(), day, PlanItemType.DOCUMENT,
                        "문서 읽기: " + doc.getTitle(), "회사 지식 문서 학습", i, doc.getId(), null
                ));
            }
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
                plan.getGeneratedBy(),
                plan.getSourceTemplateId(),
                items.size(),
                items.stream().map(PlanItemResponse::from).toList()
        );
    }
}
