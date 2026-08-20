-- OnboardOS Identity (users, workspaces, memberships)
-- ERD v1.0 aligned

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(320) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_users_email ON users (email) WHERE deleted_at IS NULL;

CREATE TABLE workspaces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(80) NOT NULL,
    settings        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT uq_workspaces_slug UNIQUE (slug),
    CONSTRAINT chk_workspaces_slug CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE TABLE memberships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces (id),
    user_id         UUID NOT NULL REFERENCES users (id),
    role            VARCHAR(30) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    department      VARCHAR(100),
    career_level    VARCHAR(30),
    title           VARCHAR(100),
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT chk_memberships_role
        CHECK (role IN ('OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'NEW_HIRE')),
    CONSTRAINT chk_memberships_status
        CHECK (status IN ('ACTIVE', 'DISABLED'))
);

CREATE UNIQUE INDEX uq_memberships_ws_user
    ON memberships (workspace_id, user_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_memberships_ws ON memberships (workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_memberships_user ON memberships (user_id) WHERE deleted_at IS NULL;
