CREATE TABLE IF NOT EXISTS telegram_reviews (
  token TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  production_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message_id INTEGER,
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_telegram_reviews_workspace_status
  ON telegram_reviews(workspace_id, status);
