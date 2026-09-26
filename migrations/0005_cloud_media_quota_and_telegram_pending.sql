-- Keep the 2 GiB workspace media limit race-safe. A trigger executes inside the
-- same SQLite write transaction as the insert, unlike an application SELECT.
CREATE TRIGGER IF NOT EXISTS cloud_media_workspace_quota_insert
BEFORE INSERT ON cloud_media
WHEN NEW.status IN ('uploading', 'ready')
  AND (
    SELECT COALESCE(SUM(byte_size), 0)
    FROM cloud_media
    WHERE workspace_id = NEW.workspace_id
      AND status IN ('uploading', 'ready')
  ) + NEW.byte_size > 2147483648
BEGIN
  SELECT RAISE(ABORT, 'cloud media workspace quota exceeded');
END;

-- Resolve any legacy duplicate pending reviews before enforcing one actionable
-- Telegram message per production.
UPDATE telegram_reviews
SET status = 'rejected', reviewed_at = COALESCE(reviewed_at, created_at)
WHERE status = 'pending'
  AND rowid NOT IN (
    SELECT MAX(rowid)
    FROM telegram_reviews
    WHERE status = 'pending'
    GROUP BY workspace_id, production_id
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_reviews_one_pending
  ON telegram_reviews(workspace_id, production_id)
  WHERE status = 'pending';
