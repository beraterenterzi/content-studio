ALTER TABLE entitlements ADD COLUMN billing_event_created INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_entitlements_billing_event_order
  ON entitlements(billing_event_created);
