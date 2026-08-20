package com.onboardos.onboarding.domain.template;

import com.onboardos.onboarding.domain.user.UserRole;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OnboardingTemplateRepository extends JpaRepository<OnboardingTemplate, UUID> {

    List<OnboardingTemplate> findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID workspaceId);

    Optional<OnboardingTemplate> findByIdAndWorkspaceIdAndDeletedAtIsNull(UUID id, UUID workspaceId);

    boolean existsByWorkspaceIdAndNameAndDeletedAtIsNull(UUID workspaceId, String name);

    Optional<OnboardingTemplate> findFirstByWorkspaceIdAndIsDefaultTrueAndDeletedAtIsNull(UUID workspaceId);

    /**
     * 역할에 맞는 템플릿. 같은 역할에 여러 개가 있으면 기본으로 지정된 것을, 그다음 최신 것을 쓴다.
     * (target_role 컬럼은 처음부터 있었지만 계획 생성에서 쓰이지 않고 있었다)
     */
    Optional<OnboardingTemplate> findFirstByWorkspaceIdAndTargetRoleAndDeletedAtIsNullOrderByIsDefaultDescCreatedAtDesc(
            UUID workspaceId, UserRole targetRole);
}
