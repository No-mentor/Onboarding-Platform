package com.onboardos.onboarding.domain.plan;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChecklistItemRepository extends JpaRepository<ChecklistItem, UUID> {

    List<ChecklistItem> findByWorkspaceIdAndUserIdAndDeletedAtIsNullOrderByDueDayAsc(UUID workspaceId, UUID userId);

    List<ChecklistItem> findByWorkspaceIdAndUserIdAndStatusAndDeletedAtIsNullOrderByDueDayAsc(
        UUID workspaceId,
        UUID userId,
        ItemStatus status
    );

    Optional<ChecklistItem> findByIdAndWorkspaceIdAndUserIdAndDeletedAtIsNull(
            UUID id,
            UUID workspaceId,
            UUID userId
    );

    Optional<ChecklistItem> findByWorkspaceIdAndUserIdAndPlanItemIdAndDeletedAtIsNull(
        UUID workspaceId,
        UUID userId,
        UUID planItemId
    );

    void deleteByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);
}
