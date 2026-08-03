package com.onboardos.onboarding.domain.template;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OnboardingTemplateRepository extends JpaRepository<OnboardingTemplate, UUID> {

    List<OnboardingTemplate> findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID workspaceId);

    Optional<OnboardingTemplate> findByIdAndWorkspaceIdAndDeletedAtIsNull(UUID id, UUID workspaceId);

    boolean existsByWorkspaceIdAndNameAndDeletedAtIsNull(UUID workspaceId, String name);

    Optional<OnboardingTemplate> findFirstByWorkspaceIdAndIsDefaultTrueAndDeletedAtIsNull(UUID workspaceId);
}
