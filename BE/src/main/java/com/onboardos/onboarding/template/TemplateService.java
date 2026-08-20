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
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
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

    public TemplateService(
            OnboardingTemplateRepository templateRepository,
            OnboardingTemplateItemRepository itemRepository,
            WorkspaceAccessService workspaceAccessService,
            DocumentRepository documentRepository,
            DocumentPermissionService documentPermissionService,
            OnboardingPlanRepository planRepository,
            @Lazy OnboardingPlanService onboardingPlanService,
            UserRepository userRepository
    ) {
        this.templateRepository = templateRepository;
        this.itemRepository = itemRepository;
        this.workspaceAccessService = workspaceAccessService;
        this.documentRepository = documentRepository;
        this.documentPermissionService = documentPermissionService;
        this.planRepository = planRepository;
        this.onboardingPlanService = onboardingPlanService;
        this.userRepository = userRepository;
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
            if (role == null || template.getTargetRole() != role) {
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
        templateRepository.findByWorkspaceIdAndTargetRoleAndDeletedAtIsNull(workspaceId, role);
        templateRepository.clearDefaultsExcept(workspaceId, role, exceptId);
    }

    // ========== 템플릿 일괄 적용 ==========

    /**
     * 이 템플릿을 sourceTemplateId로 사용 중인 활성 계획의 영향 받는 사용자 목록을 반환한다.
     */
    @Transactional(readOnly = true)
    public AffectedUsersResponse getAffectedUsers(UserPrincipal principal, UUID workspaceId, UUID templateId) {
        workspaceAccessService.requireRoles(workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN);
        requireTemplate(workspaceId, templateId);

        List<OnboardingPlan> affectedPlans = planRepository
                .findByWorkspaceIdAndSourceTemplateIdAndStatusAndDeletedAtIsNull(
                        workspaceId, templateId, PlanStatus.ACTIVE);

        List<AffectedUsersResponse.AffectedUserSummary> summaries = affectedPlans.stream()
                .map(plan -> {
                    User user = userRepository.findById(plan.getUserId()).orElse(null);
                    return new AffectedUsersResponse.AffectedUserSummary(
                            plan.getUserId(),
                            plan.getId(),
                            user != null ? user.getEmail() : null,
                            user != null ? user.getName() : null
                    );
                })
                .toList();

        return new AffectedUsersResponse(summaries.size(), summaries);
    }

    /**
     * 이 템플릿을 sourceTemplateId로 사용 중인 모든 활성 계획을 최신 템플릿으로 재생성한다.
     */
    @Transactional
    public ApplyTemplateResponse applyToActivePlans(UserPrincipal principal, UUID workspaceId,
                                                    UUID templateId, ApplyTemplateRequest request) {
        workspaceAccessService.requireRoles(workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN);
        requireTemplate(workspaceId, templateId);

        List<OnboardingPlan> affectedPlans = planRepository
                .findByWorkspaceIdAndSourceTemplateIdAndStatusAndDeletedAtIsNull(
                        workspaceId, templateId, PlanStatus.ACTIVE);

        if (affectedPlans.isEmpty()) {
            return ApplyTemplateResponse.success(List.of());
        }

        boolean keepCompleted = request != null && request.shouldKeepCompleted();
        List<ApplyTemplateResponse.AffectedUser> results = new ArrayList<>();

        for (OnboardingPlan plan : affectedPlans) {
            try {
                onboardingPlanService.generateForUser(
                        workspaceId, plan.getUserId(), true, templateId, false);
                results.add(new ApplyTemplateResponse.AffectedUser(
                        plan.getUserId(), "SUCCESS", null));
            } catch (Exception e) {
                log.warn("템플릿 일괄 적용 실패: userId={}, templateId={}, error={}",
                        plan.getUserId(), templateId, e.getMessage());
                results.add(new ApplyTemplateResponse.AffectedUser(
                        plan.getUserId(), "FAILED", e.getMessage()));
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
