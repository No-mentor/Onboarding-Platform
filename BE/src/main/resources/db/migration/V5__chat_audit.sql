CREATE TABLE chat_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces (id),
    user_id         UUID NOT NULL REFERENCES users (id),
    title           VARCHAR(200),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_chat_sessions_user
    ON chat_sessions (workspace_id, user_id)
    WHERE deleted_at IS NULL;

CREATE TABLE chat_messages (
    id                                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id                          UUID NOT NULL REFERENCES chat_sessions (id) ON DELETE CASCADE,
    workspace_id                        UUID NOT NULL REFERENCES workspaces (id),
    user_id                             UUID NOT NULL REFERENCES users (id),
    role                                VARCHAR(20) NOT NULL,
    content                             TEXT NOT NULL,
    citations                           JSONB NOT NULL DEFAULT '[]'::jsonb,
    permission_denied_document_ids      JSONB NOT NULL DEFAULT '[]'::jsonb,
    model                               VARCHAR(80),
    token_usage                         JSONB,
    created_at                          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_chat_role CHECK (role IN ('user', 'assistant', 'system'))
);

CREATE INDEX idx_chat_messages_session ON chat_messages (session_id, created_at);

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces (id),
    actor_id        UUID REFERENCES users (id),
    event_type      VARCHAR(50) NOT NULL,
    resource_type   VARCHAR(50),
    resource_id     UUID,
    result          VARCHAR(20) NOT NULL,
    message         TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_audit_result CHECK (result IN ('SUCCESS', 'DENIED', 'ERROR'))
);

CREATE INDEX idx_audit_ws_created ON audit_logs (workspace_id, created_at DESC);
CREATE INDEX idx_audit_event ON audit_logs (workspace_id, event_type, created_at DESC);
