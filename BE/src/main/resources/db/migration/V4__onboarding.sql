CREATE TABLE onboarding_plans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces (id),
    user_id             UUID NOT NULL REFERENCES users (id),
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    version             INT NOT NULL DEFAULT 1,
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    progress_percent    NUMERIC(5, 2) NOT NULL DEFAULT 0,
    generated_by        VARCHAR(20) NOT NULL DEFAULT 'TEMPLATE',
    meta                JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT chk_plan_status
        CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED')),
    CONSTRAINT chk_plan_progress
        CHECK (progress_percent >= 0 AND progress_percent <= 100),
    CONSTRAINT chk_plan_dates CHECK (end_date >= start_date)
);

CREATE UNIQUE INDEX uq_active_plan
    ON onboarding_plans (workspace_id, user_id)
    WHERE status = 'ACTIVE' AND deleted_at IS NULL;

CREATE TABLE onboarding_plan_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id             UUID NOT NULL REFERENCES onboarding_plans (id) ON DELETE CASCADE,
    workspace_id        UUID NOT NULL REFERENCES workspaces (id),
    day_index           INT NOT NULL,
    type                VARCHAR(30) NOT NULL,
    title               VARCHAR(500) NOT NULL,
    description         TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    sort_order          INT NOT NULL DEFAULT 0,
    document_id         UUID REFERENCES documents (id) ON DELETE SET NULL,
    person_name         VARCHAR(100),
    person_user_id      UUID REFERENCES users (id) ON DELETE SET NULL,
    estimated_minutes   INT,
    completed_at        TIMESTAMPTZ,
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_plan_item_day CHECK (day_index BETWEEN 1 AND 30),
    CONSTRAINT chk_plan_item_type
        CHECK (type IN ('DOCUMENT', 'PERSON', 'CHECKLIST', 'PRACTICE')),
    CONSTRAINT chk_plan_item_status
        CHECK (status IN ('PENDING', 'DONE', 'SKIPPED'))
);

CREATE INDEX idx_plan_items_plan_day ON onboarding_plan_items (plan_id, day_index);

CREATE TABLE checklist_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces (id),
    user_id         UUID NOT NULL REFERENCES users (id),
    plan_item_id    UUID REFERENCES onboarding_plan_items (id) ON DELETE SET NULL,
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    due_day         INT,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT chk_checklist_status CHECK (status IN ('PENDING', 'DONE'))
);

CREATE INDEX idx_checklist_user
    ON checklist_items (workspace_id, user_id)
    WHERE deleted_at IS NULL;

CREATE TABLE daily_recommendations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces (id),
    user_id             UUID NOT NULL REFERENCES users (id),
    recommend_date      DATE NOT NULL,
    type                VARCHAR(30) NOT NULL,
    title               VARCHAR(500) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    priority            INT NOT NULL DEFAULT 1,
    source              VARCHAR(30) NOT NULL DEFAULT 'PLAN',
    plan_item_id        UUID REFERENCES onboarding_plan_items (id) ON DELETE SET NULL,
    document_id         UUID REFERENCES documents (id) ON DELETE SET NULL,
    person_name         VARCHAR(100),
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_reco_type
        CHECK (type IN ('DOCUMENT', 'PERSON', 'CHECKLIST', 'PRACTICE')),
    CONSTRAINT chk_reco_status
        CHECK (status IN ('PENDING', 'DONE', 'DISMISSED'))
);

CREATE INDEX idx_reco_user_date
    ON daily_recommendations (workspace_id, user_id, recommend_date);
