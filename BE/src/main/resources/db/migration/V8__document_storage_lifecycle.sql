ALTER TABLE documents
    ADD COLUMN storage_purged_at TIMESTAMPTZ;

CREATE INDEX idx_documents_storage_cleanup
    ON documents (deleted_at)
    WHERE deleted_at IS NOT NULL AND storage_purged_at IS NULL;
