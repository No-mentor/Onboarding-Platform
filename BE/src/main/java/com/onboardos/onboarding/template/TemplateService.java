package com.onboardos.onboarding.template;

import com.onboardos.onboarding.document.service.DocumentPermissionService;
import com.onboardos.onboarding.domain.document.DocumentEntity;
import com.onboardos.onboarding.domain.document.DocumentRepository;
import com.onboardos.onboarding.domain.document.DocumentStatus;
import com.onboardos.onboarding.domain.document.DocumentVisibility;
import com.onboardos.onboarding.domain.plan.OnboardingPlan;
import com.onboardos.onboarding.domain.plan.OnboardingPlanRepository;
import com.onboardos.onboarding.domain.plan.PlanItemType;
import com.onboardos.onboarding.domain.plan.PlanStatus;
import com.onboardos.onboarding.domain.template.OnboardingTemplate;
import com.onboardos.onboarding.domain.template.OnboardingTemplateItem;
import com.onboardos.onboarding.domain.template.OnboardingTemplateItemRepository;
import com.onboardos.onboarding.domain.template.OnboardingTemplateRepository;
import com.onboardos.onboarding.domain.user.Membership;
import com.onboardos.onboarding.domain.user.MembershipRepository;
import com.onboardos.onboarding.domain.user.User;
import com.onboardos.onboarding.domain.user.UserRepository;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import com.onboardos.onboarding.onboarding.OnboardingPlanService;
import com.onboardos.onboarding.template.dto.AffectedUsersResponse;
import com.onboardos.onboarding.template.dto.ApplyTemplateRequest;
import com.onboardos.onboarding.template.dto.ApplyTemplateResponse;
import com.onboardos.onboarding.template.dto.CreateTemplateRequest;
import com.onboardos.onboarding.template.dto.TemplateItemRequest;
import com.onboardos.onboarding.template.dto.TemplateItemResponse;
import com.onboardos.onboarding.template.dto.TemplateResponse;
import com.onboardos.onboarding.template.dto.UpdateTemplateRequest;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.HashSet;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TemplateService {

    private static final Logger log = LoggerFactory.getLogger(TemplateService.class);

    private final OnboardingTemplateRepository templateRepository;
    private final OnboardingTemplateItemRepository itemRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final DocumentRepository documentRepository;
    private final DocumentPermissionService documentPermissionService;
    private final OnboardingPlanRepository planRepository;
    private final OnboardingPlanService onboardingPlanService;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;

    public TemplateService(
            OnboardingTemplateRepository templateRepository,
            OnboardingTemplateItemRepository itemRepository,
            WorkspaceAccessService workspaceAccessService,
            DocumentRepository documentRepository,
            DocumentPermissionService documentPermissionService,
            OnboardingPlanRepository planRepository,
            @Lazy OnboardingPlanService onboardingPlanService,
            UserRepository userRepository,
            MembershipRepository membershipRepository
    ) {
        this.templateRepository = templateRepository;
        this.itemRepository = itemRepository;
        this.workspaceAccessService = workspaceAccessService;
        this.documentRepository = documentRepository;
        this.documentPermissionService = documentPermissionService;
        this.planRepository = planRepository;
        this.onboardingPlanService = onboardingPlanService;
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
    }

    public record SelectedTemplate(UUID templateId, List<OnboardingTemplateItem> items) {}

    @Transactional(readOnly = true)
    public List<TemplateResponse> list(UserPrincipal principal, UUID workspaceId) {
        workspaceAccessService.requireRoles(workspaceId, principal.getId(),
                UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER);
        return templateRepository.findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc(workspaceId).stream()
                .map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public TemplateResponse get(UserPrincipal principal, UUID workspaceId, UUID templateId) {
        workspaceAccessService.requireRoles(workspaceId, principal.getId(),
                UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER);
        return toResponse(requireTemplate(workspaceId, templateId));
    }

    @Transactional
    public TemplateResponse create(UserPrincipal principal, UUID workspaceId, CreateTemplateRequest request) {
        Membership actor = workspaceAccessService.requireRoles(workspaceId, principal.getId(),
                UserRole.OWNER, UserRole.ADMIN);
        String name = request.name().trim();
        if (templateRepository.existsByWorkspaceIdAndNameAndDeletedAtIsNull(workspaceId, name)) {
            throw new BusinessException(ErrorCode.CONFLICT, "같은 이름의 템플릿이 있습니다.");
        }
        OnboardingTemplate template = OnboardingTemplate.create(workspaceId, name, request.targetRole(),
                request.description(), Boolean.TRUE.equals(request.isDefault()));
        if (template.isDefault()) clearExistingDefault(workspaceId, template.getTargetRole(), null);
        templateRepository.saveAndFlush(template);
        saveItems(template.getId(), request.items(), workspaceId, actor, template.getTargetRole());
        return toResponse(template);
    }

    @Transactional
    public TemplateResponse update(UserPrincipal principal, UUID workspaceId, UUID templateId,
                                   UpdateTemplateRequest request) {
        Membership actor = workspaceAccessService.requireRoles(workspaceId, principal.getId(),
                UserRole.OWNER, UserRole.ADMIN);
        OnboardingTemplate template = requireTemplate(workspaceId, templateId);
        UserRole resultingRole = request.targetRole() == null ? template.getTargetRole() : request.targetRole();
        boolean resultingDefault = request.isDefault() == null ? template.isDefault() : request.isDefault();
        if (resultingDefault) clearExistingDefault(workspaceId, resultingRole, templateId);
        template.update(request.name(), request.targetRole(), request.description(), request.isDefault());
        if (request.items() != null) {
            if (request.items().isEmpty()) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR, "템플릿에는 하나 이상의 항목이 필요합니다.");
            }
            itemRepository.deleteByTemplateId(templateId);
            saveItems(templateId, request.items(), workspaceId, actor, template.getTargetRole());
        } else {
            validateExistingDocumentsForRole(templateId, workspaceId, actor, template.getTargetRole());
        }
        return toResponse(template);
    }

    @Transactional
    public void delete(UserPrincipal principal, UUID workspaceId, UUID templateId) {
        workspaceAccessService.requireRoles(workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN);
        requireTemplate(workspaceId, templateId).softDelete();
    }

    @Transactional(readOnly = true)
    public List<OnboardingTemplateItem> loadItemsForPlan(UUID workspaceId, UUID templateId) {
        return loadItemsForPlan(workspaceId, templateId, null);
    }

    @Transactional(readOnly = true)
    public List<OnboardingTemplateItem> loadItemsForPlan(UUID workspaceId, UUID templateId, UserRole role) {
        return selectForPlan(workspaceId, templateId, role).map(SelectedTemplate::items).orElse(List.of());
    }

    @Transactional(readOnly = true)
    public Optional<SelectedTemplate> selectForPlan(UUID workspaceId, UUID templateId, UserRole role) {
        if (templateId != null) {
            OnboardingTemplate template = requireTemplate(workspaceId, templateId);
            // templateId 가 직접 지정된 경우, role 이 일치하거나 role 이 null (관리자 일괄 적용 등)이면 허용
            if (role != null && template.getTargetRole() != role) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR, "대상 역할과 호환되지 않는 템플릿입니다.");
            }
            return Optional.of(selected(template));
        }
        if (role == null) return Optional.empty();
        return templateRepository.findFirstByWorkspaceIdAndTargetRoleAndIsDefaultTrueAndDeletedAtIsNull(
                workspaceId, role).map(this::selected);
    }

    @Transactional(readOnly = true)
    public UUID resolveTemplateId(UUID workspaceId, UUID templateId, UserRole role) {
        return selectForPlan(workspaceId, templateId, role).map(SelectedTemplate::templateId).orElse(null);
    }

    private SelectedTemplate selected(OnboardingTemplate template) {
        return new SelectedTemplate(template.getId(),
                itemRepository.findByTemplateIdOrderByDayIndexAscSortOrderAsc(template.getId()));
    }

    private void saveItems(UUID templateId, List<TemplateItemRequest> items,
                           UUID workspaceId, Membership actor, UserRole targetRole) {
        List<OnboardingTemplateItem> entities = new ArrayList<>();
        int index = 0;
        for (TemplateItemRequest item : items) {
            if (item.type() == PlanItemType.DOCUMENT) {
                if (item.documentId() == null) {
                    throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                            "DOCUMENT 항목에는 documentId가 필요합니다.");
                }
                validateDocument(item.documentId(), workspaceId, actor, targetRole);
            } else if (item.documentId() != null) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                        "DOCUMENT가 아닌 항목에는 documentId를 지정할 수 없습니다.");
            }
            entities.add(OnboardingTemplateItem.create(templateId, item.dayIndex(), item.type(),
                    item.title().trim(), item.description(), item.sortOrder() == null ? index : item.sortOrder(),
                    item.documentId(), item.estimatedMinutes()));
            index++;
        }
        itemRepository.saveAll(entities);
    }

    private void validateDocument(UUID documentId, UUID workspaceId, Membership actor, UserRole targetRole) {
        DocumentEntity document = documentRepository.findByIdAndWorkspaceIdAndDeletedAtIsNull(documentId, workspaceId)
                .filter(d -> d.getStatus() == DocumentStatus.READY)
                .filter(d -> documentPermissionService.canAccess(d, actor))
                .filter(d -> isAccessibleToRole(d, targetRole))
                .orElseThrow(() -> new BusinessException(ErrorCode.VALIDATION_ERROR,
                        "대상 역할이 접근 가능한 READY 문서만 템플릿에 사용할 수 있습니다."));
    }

    private void validateExistingDocumentsForRole(UUID templateId, UUID workspaceId,
                                                  Membership actor, UserRole targetRole) {
        for (OnboardingTemplateItem item : itemRepository
                .findByTemplateIdOrderByDayIndexAscSortOrderAsc(templateId)) {
            if (item.getType() == PlanItemType.DOCUMENT && item.getDocumentId() != null) {
                validateDocument(item.getDocumentId(), workspaceId, actor, targetRole);
            }
        }
    }

    private static boolean isAccessibleToRole(DocumentEntity document, UserRole role) {
        if (document.getVisibility() == DocumentVisibility.WORKSPACE) return true;
        List<String> allowed = document.getAllowedRoles();
        if (allowed == null || allowed.isEmpty()) {
            return role == UserRole.OWNER || role == UserRole.ADMIN;
        }
        return allowed.contains(role.name());
    }

    private void clearExistingDefault(UUID workspaceId, UserRole role, UUID exceptId) {
        templateRepository.clearDefaultsExcept(workspaceId, role, exceptId);
    }

    // ========== 템플릿 일괄 적용 ==========

    /**
     * 이 템플릿을 sourceTemplateId로 사용 중인 활성 계획의 영향 받는 사용자 목록을 반환한다.
     */
    @Transactional(readOnly = true)
    public AffectedUsersResponse getAffectedUsers(UserPrincipal principal, UUID workspaceId, UUID templateId) {
        workspaceAccessService.requireRoles(workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN);
        OnboardingTemplate template = requireTemplate(workspaceId, templateId);

        UserRole targetRole = template.getTargetRole();
        Set<UUID> targetUserIds = collectTargetUserIds(workspaceId, templateId, targetRole, principal.getId());

        // 한 번에 User 와 Plan 을 조회해서 N+1 방지
        Map<UUID, User> userMap = userRepository.findAllById(targetUserIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        Map<UUID, UUID> userPlanMap = planRepository
                .findByWorkspaceIdAndStatusAndDeletedAtIsNull(workspaceId, PlanStatus.ACTIVE).stream()
                .filter(plan -> targetUserIds.contains(plan.getUserId()))
                .collect(Collectors.toMap(OnboardingPlan::getUserId, OnboardingPlan::getId, (a, b) -> a));

        List<AffectedUsersResponse.AffectedUserSummary> summaries = targetUserIds.stream()
                .map(userId -> {
                    User user = userMap.get(userId);
                    return new AffectedUsersResponse.AffectedUserSummary(
                            userId,
                            userPlanMap.get(userId),
                            user != null ? user.getEmail() : null,
                            user != null ? user.getName() : null
                    );
                })
                .toList();

        return new AffectedUsersResponse(summaries.size(), summaries);
    }

    /**
     * 이 템플릿을 적용할 대상 사용자를 모은다.
     * 1) targetRole 에 해당하는 활성 멤버 전체 (계획 유무 무관)
     * 2) sourceTemplateId 가 일치하는 활성 계획 보유자
     * 관리자 자신은 제외.
     */
    private Set<UUID> collectTargetUserIds(UUID workspaceId, UUID templateId,
                                           UserRole targetRole, UUID excludeUserId) {
        Set<UUID> targetUserIds = new HashSet<>();
        if (targetRole != null) {
            membershipRepository.findByWorkspaceIdAndRoleAndDeletedAtIsNull(workspaceId, targetRole).stream()
                    .filter(Membership::isActive)
                    .map(Membership::getUserId)
                    .forEach(targetUserIds::add);
        }
        planRepository.findByWorkspaceIdAndSourceTemplateIdAndStatusAndDeletedAtIsNull(
                workspaceId, templateId, PlanStatus.ACTIVE).stream()
                .map(OnboardingPlan::getUserId)
                .forEach(targetUserIds::add);

        targetUserIds.remove(excludeUserId);
        return targetUserIds;
    }

    /**
     * 이 템플릿을 대상 사용자 전원에게 일괄 적용한다.
     * 각 사용자 적용은 독립 트랜잭션으로 처리되어, 한 명이 실패해도 나머지는 정상 커밋된다.
     * (이 메서드 자체는 트랜잭션 바깥에서 실행된다)
     */
    public ApplyTemplateResponse applyToActivePlans(UserPrincipal principal, UUID workspaceId,
                                                    UUID templateId, ApplyTemplateRequest request) {
        // 권한 검사와 템플릿 조회는 여기서 한다
        workspaceAccessService.requireRoles(workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN);
        OnboardingTemplate template = requireTemplate(workspaceId, templateId);

        UserRole targetRole = template.getTargetRole();
        Set<UUID> targetUserIds = collectTargetUserIds(workspaceId, templateId, targetRole, principal.getId());

        if (targetUserIds.isEmpty()) {
            return ApplyTemplateResponse.success(List.of());
        }

        boolean keepCompleted = request != null && request.shouldKeepCompleted();

        // 기존 계획이 있는 사용자의 planId 를 미리 조회
        Map<UUID, UUID> userPlanMap = planRepository
                .findByWorkspaceIdAndStatusAndDeletedAtIsNull(workspaceId, PlanStatus.ACTIVE).stream()
                .filter(plan -> targetUserIds.contains(plan.getUserId()))
                .collect(Collectors.toMap(OnboardingPlan::getUserId, OnboardingPlan::getId, (a, b) -> a));

        List<ApplyTemplateResponse.AffectedUser> results = new ArrayList<>();

        for (UUID userId : targetUserIds) {
            try {
                UUID existingPlanId = userPlanMap.get(userId);
                if (existingPlanId != null && keepCompleted) {
                    // 기존 계획이 있고 완료 항목 유지 → regenerate 사용
                    onboardingPlanService.regenerate(principal, workspaceId, existingPlanId, true, templateId);
                } else {
                    // 계획이 없거나 전체 재생성 → generateForUser 사용
                    onboardingPlanService.generateForUser(workspaceId, userId, true, templateId, false);
                }
                results.add(new ApplyTemplateResponse.AffectedUser(userId, "SUCCESS", null));
            } catch (Exception e) {
                log.warn("템플릿 일괄 적용 실패: userId={}, templateId={}, error={}",
                        userId, templateId, e.getMessage());
                results.add(new ApplyTemplateResponse.AffectedUser(userId, "FAILED", e.getMessage()));
            }
        }

        return ApplyTemplateResponse.success(results);
    }

    private OnboardingTemplate requireTemplate(UUID workspaceId, UUID templateId) {
        return templateRepository.findByIdAndWorkspaceIdAndDeletedAtIsNull(templateId, workspaceId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "템플릿을 찾을 수 없습니다."));
    }

    private TemplateResponse toResponse(OnboardingTemplate template) {
        List<TemplateItemResponse> items = itemRepository
                .findByTemplateIdOrderByDayIndexAscSortOrderAsc(template.getId()).stream()
                .map(TemplateItemResponse::from).toList();
        return TemplateResponse.of(template, items);
    }
}
