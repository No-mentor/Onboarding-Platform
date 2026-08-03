package com.onboardos.onboarding.domain.workspace;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceRepository extends JpaRepository<Workspace, UUID> {

    boolean existsBySlugAndDeletedAtIsNull(String slug);

    Optional<Workspace> findByIdAndDeletedAtIsNull(UUID id);
}
