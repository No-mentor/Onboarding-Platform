CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE document_chunks
    ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- HNSW: 빈 테이블에서도 생성 가능, 코사인 유사도 검색용
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw
    ON document_chunks
    USING hnsw (embedding vector_cosine_ops);
