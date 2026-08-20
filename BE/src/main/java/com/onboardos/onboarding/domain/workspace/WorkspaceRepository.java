package com.onboardos.onboarding.domain.workspace;

import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WorkspaceRepository extends JpaRepository<Workspace, UUID> {

    boolean existsBySlugAndDeletedAtIsNull(String slug);

    Optional<Workspace> findByIdAndDeletedAtIsNull(UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from Workspace w where w.id = :id and w.deletedAt is null")
    Optional<Workspace> findByIdForMemberUpdate(@Param("id") UUID id);
}
