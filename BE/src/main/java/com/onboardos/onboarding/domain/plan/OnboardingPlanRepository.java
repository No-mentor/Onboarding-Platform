package com.onboardos.onboarding.domain.plan;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OnboardingPlanRepository extends JpaRepository<OnboardingPlan, UUID> {

    Optional<OnboardingPlan> findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNull(
            UUID workspaceId,
            UUID userId,
            String status
    );

    Optional<OnboardingPlan> findByIdAndWorkspaceIdAndDeletedAtIsNull(UUID id, UUID workspaceId);

    List<OnboardingPlan> findByWorkspaceIdAndStatusAndDeletedAtIsNull(UUID workspaceId, String status);
}

