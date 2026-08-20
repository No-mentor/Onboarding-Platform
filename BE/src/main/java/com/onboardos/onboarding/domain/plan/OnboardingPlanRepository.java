package com.onboardos.onboarding.domain.plan;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OnboardingPlanRepository extends JpaRepository<OnboardingPlan, UUID> {

    Optional<OnboardingPlan> findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNull(
            UUID workspaceId,
            UUID userId,
            PlanStatus status
    );

    Optional<OnboardingPlan> findByIdAndWorkspaceIdAndDeletedAtIsNull(UUID id, UUID workspaceId);

    Optional<OnboardingPlan> findFirstByWorkspaceIdAndUserIdAndDeletedAtIsNullOrderByVersionDesc(
            UUID workspaceId, UUID userId);

    List<OnboardingPlan> findByWorkspaceIdAndStatusAndDeletedAtIsNull(UUID workspaceId, PlanStatus status);
}
