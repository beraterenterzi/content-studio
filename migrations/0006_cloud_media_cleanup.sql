ALTER TABLE cloud_media ADD COLUMN cleanup_pending INTEGER NOT NULL DEFAULT 0
  CHECK (cleanup_pending IN (0, 1));

CREATE INDEX IF NOT EXISTS idx_cloud_media_cleanup_pending
  ON cloud_media(workspace_id, cleanup_pending, created_at);
