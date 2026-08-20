ALTER TABLE onboarding_template_items
    ADD COLUMN document_id UUID REFERENCES documents (id) ON DELETE SET NULL,
    ADD COLUMN estimated_minutes INT;

ALTER TABLE onboarding_template_items
    ADD CONSTRAINT chk_template_item_estimated_minutes
        CHECK (estimated_minutes IS NULL OR estimated_minutes >= 0);

ALTER TABLE onboarding_plans
    ADD COLUMN source_template_id UUID REFERENCES onboarding_templates (id) ON DELETE SET NULL;

ALTER TABLE onboarding_plan_items
    ADD COLUMN source_template_item_id UUID REFERENCES onboarding_template_items (id) ON DELETE SET NULL;

CREATE INDEX idx_plan_items_source_template_item
    ON onboarding_plan_items (source_template_item_id)
    WHERE source_template_item_id IS NOT NULL;

WITH ranked_defaults AS (
    SELECT id,
           row_number() OVER (
               PARTITION BY workspace_id, target_role
               ORDER BY updated_at DESC, created_at DESC, id DESC
           ) AS default_rank
    FROM onboarding_templates
    WHERE is_default = TRUE AND deleted_at IS NULL
)
UPDATE onboarding_templates template
SET is_default = FALSE
FROM ranked_defaults ranked
WHERE template.id = ranked.id AND ranked.default_rank > 1;

CREATE UNIQUE INDEX uq_default_template_per_role
    ON onboarding_templates (workspace_id, target_role)
    WHERE is_default = TRUE AND deleted_at IS NULL;
