package com.onboardos.onboarding.domain.document;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DocumentRepository extends JpaRepository<DocumentEntity, UUID> {

    List<DocumentEntity> findByWorkspaceIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID workspaceId);

    Optional<DocumentEntity> findByIdAndWorkspaceIdAndDeletedAtIsNull(UUID id, UUID workspaceId);

    List<DocumentEntity> findByWorkspaceIdAndStatusAndDeletedAtIsNull(UUID workspaceId, DocumentStatus status);

    @Query(value = """
            SELECT d.*
            FROM documents d
            WHERE d.workspace_id = :workspaceId
              AND d.deleted_at IS NULL
              AND (:status IS NULL OR d.status = CAST(:status AS varchar))
              AND (
                    d.visibility = 'WORKSPACE'
                    OR (
                        d.visibility = 'RESTRICTED'
                        AND (
                            (jsonb_array_length(d.allowed_roles) = 0 AND :role IN ('OWNER', 'ADMIN'))
                            OR jsonb_exists(d.allowed_roles, :role)
                        )
                    )
              )
            ORDER BY d.created_at DESC, d.id DESC
            """, countQuery = """
            SELECT count(*)
            FROM documents d
            WHERE d.workspace_id = :workspaceId
              AND d.deleted_at IS NULL
              AND (:status IS NULL OR d.status = CAST(:status AS varchar))
              AND (
                    d.visibility = 'WORKSPACE'
                    OR (
                        d.visibility = 'RESTRICTED'
                        AND (
                            (jsonb_array_length(d.allowed_roles) = 0 AND :role IN ('OWNER', 'ADMIN'))
                            OR jsonb_exists(d.allowed_roles, :role)
                        )
                    )
              )
            """, nativeQuery = true)
    Page<DocumentEntity> findAccessible(
            @Param("workspaceId") UUID workspaceId,
            @Param("role") String role,
            @Param("status") String status,
            Pageable pageable
    );
}
