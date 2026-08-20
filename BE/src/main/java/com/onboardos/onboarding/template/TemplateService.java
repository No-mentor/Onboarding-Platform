package com.onboardos.onboarding.template;

import com.onboardos.onboarding.domain.template.OnboardingTemplate;
import com.onboardos.onboarding.domain.template.OnboardingTemplateItem;
import com.onboardos.onboarding.domain.template.OnboardingTemplateItemRepository;
import com.onboardos.onboarding.domain.template.OnboardingTemplateRepository;
import com.onboardos.onboarding.domain.user.UserRole;
import com.onboardos.onboarding.global.exception.BusinessException;
import com.onboardos.onboarding.global.exception.ErrorCode;
import com.onboardos.onboarding.global.security.UserPrincipal;
import com.onboardos.onboarding.global.workspace.WorkspaceAccessService;
import com.onboardos.onboarding.template.dto.CreateTemplateRequest;
import com.onboardos.onboarding.template.dto.TemplateItemRequest;
import com.onboardos.onboarding.template.dto.TemplateItemResponse;
import com.onboardos.onboarding.template.dto.TemplateResponse;
import com.onboardos.onboarding.template.dto.UpdateTemplateRequest;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TemplateService {

    private final OnboardingTemplateRepository templateRepository;
    private final OnboardingTemplateItemRepository itemRepository;
    private final WorkspaceAccessService workspaceAccessService;

    @Transactional(readOnly = true)
    public List<TemplateResponse> list(UserPrincipal principal, UUID workspaceId) {
        workspaceAccessService.requireRoles(
                workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER
        );
        return templateRepository.findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc(workspaceId).stream()
                .map(t -> toResponse(t, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public TemplateResponse get(UserPrincipal principal, UUID workspaceId, UUID templateId) {
        workspaceAccessService.requireRoles(
                workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER
        );
        OnboardingTemplate t = requireTemplate(workspaceId, templateId);
        return toResponse(t, true);
    }

    @Transactional
    public TemplateResponse create(UserPrincipal principal, UUID workspaceId, CreateTemplateRequest request) {
        workspaceAccessService.requireRoles(workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN);
        if (templateRepository.existsByWorkspaceIdAndNameAndDeletedAtIsNull(workspaceId, request.name().trim())) {
            throw new BusinessException(ErrorCode.CONFLICT, "같은 이름의 템플릿이 있습니다.");
        }

        OnboardingTemplate template = OnboardingTemplate.create(
                workspaceId,
                request.name(),
                request.targetRole(),
                request.description(),
                Boolean.TRUE.equals(request.isDefault())
        );
        templateRepository.save(template);
        saveItems(template.getId(), request.items());
        return toResponse(template, true);
    }

    @Transactional
    public TemplateResponse update(
            UserPrincipal principal,
            UUID workspaceId,
            UUID templateId,
            UpdateTemplateRequest request
    ) {
        workspaceAccessService.requireRoles(workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN);
        OnboardingTemplate template = requireTemplate(workspaceId, templateId);
        template.update(request.name(), request.targetRole(), request.description(), request.isDefault());
        if (request.items() != null) {
            itemRepository.deleteByTemplateId(templateId);
            saveItems(templateId, request.items());
        }
        return toResponse(template, true);
    }

    @Transactional
    public void delete(UserPrincipal principal, UUID workspaceId, UUID templateId) {
        workspaceAccessService.requireRoles(workspaceId, principal.getId(), UserRole.OWNER, UserRole.ADMIN);
        OnboardingTemplate template = requireTemplate(workspaceId, templateId);
        template.softDelete();
    }

    @Transactional(readOnly = true)
    public List<OnboardingTemplateItem> loadItemsForPlan(UUID workspaceId, UUID templateId) {
        return loadItemsForPlan(workspaceId, templateId, null);
    }

    /**
     * 계획 생성에 쓸 템플릿 항목을 고른다. 우선순위는
     * 명시된 템플릿 → 대상 역할용 템플릿 → 워크스페이스 기본 템플릿 → 없음(호출자가 기본 골격 사용).
     *
     * @param memberRole 계획을 받을 멤버의 역할. null 이면 역할 매칭을 건너뛴다
     */
    @Transactional(readOnly = true)
    public List<OnboardingTemplateItem> loadItemsForPlan(UUID workspaceId, UUID templateId, UserRole memberRole) {
        if (templateId != null) {
            OnboardingTemplate t = templateRepository.findByIdAndWorkspaceIdAndDeletedAtIsNull(templateId, workspaceId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "템플릿이 없습니다."));
            return itemRepository.findByTemplateIdOrderByDayIndexAscSortOrderAsc(t.getId());
        }

        if (memberRole != null) {
            List<OnboardingTemplateItem> byRole = templateRepository
                    .findFirstByWorkspaceIdAndTargetRoleAndDeletedAtIsNullOrderByIsDefaultDescCreatedAtDesc(
                            workspaceId, memberRole)
                    .map(t -> itemRepository.findByTemplateIdOrderByDayIndexAscSortOrderAsc(t.getId()))
                    .orElse(List.of());
            if (!byRole.isEmpty()) {
                return byRole;
            }
        }

        return templateRepository.findFirstByWorkspaceIdAndIsDefaultTrueAndDeletedAtIsNull(workspaceId)
                .map(t -> itemRepository.findByTemplateIdOrderByDayIndexAscSortOrderAsc(t.getId()))
                .orElse(List.of());
    }

    private void saveItems(UUID templateId, List<TemplateItemRequest> items) {
        if (items == null || items.isEmpty()) {
            return;
        }
        List<OnboardingTemplateItem> entities = new ArrayList<>();
        int idx = 0;
        for (TemplateItemRequest item : items) {
            entities.add(OnboardingTemplateItem.create(
                    templateId,
                    item.dayIndex(),
                    item.type(),
                    item.title(),
                    item.description(),
                    item.sortOrder() == null ? idx : item.sortOrder()
            ));
            idx++;
        }
        itemRepository.saveAll(entities);
    }

    private OnboardingTemplate requireTemplate(UUID workspaceId, UUID templateId) {
        return templateRepository.findByIdAndWorkspaceIdAndDeletedAtIsNull(templateId, workspaceId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "템플릿이 없습니다."));
    }

    private TemplateResponse toResponse(OnboardingTemplate t, boolean withItems) {
        List<TemplateItemResponse> items = withItems
                ? itemRepository.findByTemplateIdOrderByDayIndexAscSortOrderAsc(t.getId()).stream()
                .map(TemplateItemResponse::from)
                .toList()
                : List.of();
        return TemplateResponse.of(t, items);
    }
}
