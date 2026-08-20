package com.onboardos.onboarding.domain.plan;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OnboardingPlanItemRepository extends JpaRepository<OnboardingPlanItem, UUID> {

    List<OnboardingPlanItem> findByPlanIdOrderByDayIndexAscSortOrderAsc(UUID planId);

    List<OnboardingPlanItem> findByPlanIdAndDayIndexOrderBySortOrderAsc(UUID planId, int dayIndex);

    Optional<OnboardingPlanItem> findByIdAndWorkspaceId(UUID id, UUID workspaceId);

    long countByPlanIdAndStatusNot(UUID planId, ItemStatus status);

    long countByPlanIdAndStatus(UUID planId, ItemStatus status);

    void deleteByPlanId(UUID planId);
}
