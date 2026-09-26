ALTER TABLE users ADD COLUMN email_verified_at TEXT;

-- Existing accounts predate email delivery. Grandfather them so the migration
-- does not unexpectedly lock current users out; every new account starts
-- unverified and must use a single-use token.
UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_action_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_action_tokens_lookup
  ON auth_action_tokens(token_hash, purpose, used_at, expires_at);

CREATE TABLE IF NOT EXISTS analytics_daily (
  event_day TEXT NOT NULL,
  event_name TEXT NOT NULL,
  dimension_key TEXT NOT NULL DEFAULT 'all',
  event_count INTEGER NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (event_day, event_name, dimension_key)
);

CREATE TABLE IF NOT EXISTS managed_global_usage (
  usage_day TEXT NOT NULL,
  action TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (usage_day, action)
);
