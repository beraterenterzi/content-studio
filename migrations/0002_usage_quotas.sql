CREATE TABLE IF NOT EXISTS usage_daily (
  workspace_id TEXT NOT NULL,
  usage_day TEXT NOT NULL,
  action TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, usage_day, action),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_usage_daily_day_action
  ON usage_daily(usage_day, action);
