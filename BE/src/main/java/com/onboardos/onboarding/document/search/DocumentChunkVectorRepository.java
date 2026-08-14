package com.onboardos.onboarding.document.search;

import com.onboardos.onboarding.domain.document.DocumentChunk;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class DocumentChunkVectorRepository {

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public void updateEmbedding(UUID chunkId, String pgVectorLiteral) {
        entityManager.createNativeQuery(
                        "UPDATE document_chunks SET embedding = CAST(:vec AS vector) WHERE id = :id"
                )
                .setParameter("vec", pgVectorLiteral)
                .setParameter("id", chunkId)
                .executeUpdate();
    }

    @SuppressWarnings("unchecked")
    @Transactional(readOnly = true)
    public List<DocumentChunk> searchByVector(UUID workspaceId, String pgVectorLiteral, int limit) {
        return entityManager.createNativeQuery(
                        """
                                SELECT c.* FROM document_chunks c
                                JOIN documents d ON d.id = c.document_id
                                WHERE c.workspace_id = :ws
                                  AND d.deleted_at IS NULL
                                  AND d.status = 'READY'
                                  AND c.embedding IS NOT NULL
                                ORDER BY c.embedding <=> CAST(:vec AS vector)
                                LIMIT :lim
                                """,
                        DocumentChunk.class
                )
                .setParameter("ws", workspaceId)
                .setParameter("vec", pgVectorLiteral)
                .setParameter("lim", limit)
                .getResultList();
    }
}
