package com.onboardos.onboarding.domain.document;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, UUID> {

    void deleteByDocumentId(UUID documentId);

    List<DocumentChunk> findByDocumentIdOrderByChunkIndexAsc(UUID documentId);

    @Query(value = """
            SELECT c.* FROM document_chunks c
            JOIN documents d ON d.id = c.document_id
            WHERE c.workspace_id = :workspaceId
              AND d.deleted_at IS NULL
              AND d.status = 'READY'
              AND lower(c.content) LIKE lower(concat('%', :q, '%'))
            ORDER BY c.chunk_index
            LIMIT :limit
            """, nativeQuery = true)
    List<DocumentChunk> searchByKeyword(
            @Param("workspaceId") UUID workspaceId,
            @Param("q") String q,
            @Param("limit") int limit
    );
}
