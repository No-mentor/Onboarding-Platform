CREATE TABLE onboarding_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces (id),
    name            VARCHAR(200) NOT NULL,
    target_role     VARCHAR(30) NOT NULL DEFAULT 'NEW_HIRE',
    description     TEXT,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT chk_template_role
        CHECK (target_role IN ('OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'NEW_HIRE'))
);

CREATE UNIQUE INDEX uq_template_name
    ON onboarding_templates (workspace_id, name)
    WHERE deleted_at IS NULL;

CREATE TABLE onboarding_template_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     UUID NOT NULL REFERENCES onboarding_templates (id) ON DELETE CASCADE,
    day_index       INT NOT NULL,
    type            VARCHAR(30) NOT NULL,
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    sort_order      INT NOT NULL DEFAULT 0,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT chk_template_item_day CHECK (day_index BETWEEN 1 AND 30),
    CONSTRAINT chk_template_item_type
        CHECK (type IN ('DOCUMENT', 'PERSON', 'CHECKLIST', 'PRACTICE'))
);

CREATE INDEX idx_template_items_template ON onboarding_template_items (template_id, day_index);
