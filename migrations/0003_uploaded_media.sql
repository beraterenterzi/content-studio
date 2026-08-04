CREATE TABLE IF NOT EXISTS uploaded_media (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  data_url TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_uploaded_media_workspace
  ON uploaded_media(workspace_id, created_at);
