CREATE TABLE documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces (id),
    title               VARCHAR(500) NOT NULL,
    description         TEXT,
    storage_key         VARCHAR(500) NOT NULL,
    original_filename   VARCHAR(500),
    mime_type           VARCHAR(120),
    size_bytes          BIGINT,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    visibility          VARCHAR(20) NOT NULL DEFAULT 'WORKSPACE',
    allowed_roles       JSONB NOT NULL DEFAULT '[]'::jsonb,
    error_message       TEXT,
    chunk_count         INT NOT NULL DEFAULT 0,
    uploaded_by         UUID REFERENCES users (id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT chk_documents_status
        CHECK (status IN ('PENDING', 'PROCESSING', 'READY', 'FAILED')),
    CONSTRAINT chk_documents_visibility
        CHECK (visibility IN ('WORKSPACE', 'RESTRICTED'))
);

CREATE INDEX idx_documents_ws_status
    ON documents (workspace_id, status)
    WHERE deleted_at IS NULL;

CREATE TABLE document_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
    workspace_id    UUID NOT NULL REFERENCES workspaces (id),
    chunk_index     INT NOT NULL,
    content         TEXT NOT NULL,
    token_count     INT,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_chunks_doc_index UNIQUE (document_id, chunk_index),
    CONSTRAINT chk_chunk_index CHECK (chunk_index >= 0)
);

CREATE INDEX idx_chunks_ws ON document_chunks (workspace_id);
CREATE INDEX idx_chunks_document ON document_chunks (document_id);

CREATE TABLE jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces (id),
    type            VARCHAR(50) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    progress        INT NOT NULL DEFAULT 0,
    target_type     VARCHAR(50),
    target_id       UUID,
    error_message   TEXT,
    payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at      TIMESTAMPTZ,
    finished_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_jobs_progress CHECK (progress >= 0 AND progress <= 100),
    CONSTRAINT chk_jobs_status
        CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED'))
);

CREATE INDEX idx_jobs_ws_status ON jobs (workspace_id, status);
