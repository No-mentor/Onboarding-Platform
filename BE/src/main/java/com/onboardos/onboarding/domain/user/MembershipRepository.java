package com.onboardos.onboarding.domain.user;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MembershipRepository extends JpaRepository<Membership, UUID> {

    List<Membership> findByUserIdAndDeletedAtIsNull(UUID userId);

    List<Membership> findByWorkspaceIdAndDeletedAtIsNull(UUID workspaceId);

    List<Membership> findByWorkspaceIdAndRoleAndDeletedAtIsNull(UUID workspaceId, UserRole role);

    Optional<Membership> findByWorkspaceIdAndUserIdAndDeletedAtIsNull(UUID workspaceId, UUID userId);

    boolean existsByWorkspaceIdAndUserIdAndDeletedAtIsNull(UUID workspaceId, UUID userId);
}


