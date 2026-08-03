CREATE TABLE invitations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces (id),
    email           VARCHAR(320) NOT NULL,
    role            VARCHAR(30) NOT NULL,
    department      VARCHAR(100),
    career_level    VARCHAR(30),
    title           VARCHAR(100),
    token           VARCHAR(64) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    invited_by      UUID REFERENCES users (id),
    expires_at      TIMESTAMPTZ NOT NULL,
    accepted_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_invitations_token UNIQUE (token),
    CONSTRAINT chk_invitations_role
        CHECK (role IN ('OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'NEW_HIRE')),
    CONSTRAINT chk_invitations_status
        CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'))
);

CREATE UNIQUE INDEX uq_invitations_pending_email
    ON invitations (workspace_id, email)
    WHERE status = 'PENDING';

CREATE INDEX idx_invitations_ws ON invitations (workspace_id);
