package com.onboardos.onboarding.domain.plan;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyRecommendationRepository extends JpaRepository<DailyRecommendation, UUID> {

    List<DailyRecommendation> findByWorkspaceIdAndUserIdAndRecommendDateOrderByPriorityAsc(
            UUID workspaceId,
            UUID userId,
            LocalDate date
    );

    Optional<DailyRecommendation> findByIdAndWorkspaceIdAndUserId(UUID id, UUID workspaceId, UUID userId);

    void deleteByWorkspaceIdAndUserIdAndRecommendDate(UUID workspaceId, UUID userId, LocalDate date);
}
