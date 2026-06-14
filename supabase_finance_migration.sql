-- ============================================================
-- Renix Finance — Database Schema Migration
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ── Step 0: Ensure audit_log table has required columns ─────────
ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS performed_by UUID;

-- ── Step 1: transactions table (missing) ───────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL,
  branch_id       UUID,
  type            TEXT NOT NULL CHECK (type IN ('revenue','refund','tax','expense','adjustment')),
  amount          NUMERIC(12,2) NOT NULL,
  description     TEXT,
  reference_id    UUID,
  reference_type  TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Step 2: expenses table fixes ───────────────────────────────
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS expense_date TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by   UUID REFERENCES auth.users(id);

-- Optional: Migrate existing recorded_by to created_by if needed
UPDATE expenses SET created_by = recorded_by WHERE created_by IS NULL AND recorded_by IS NOT NULL;

-- Optional: Drop recorded_by if no longer needed (uncomment carefully)
-- ALTER TABLE expenses DROP COLUMN IF EXISTS recorded_by;

-- ── Step 3: order_items fixes ──────────────────────────────────
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS cost_price      NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS product_name    TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount      NUMERIC(12,2) DEFAULT 0;

-- Optional: Populate product_name from products table
UPDATE order_items oi
SET product_name = p.name
FROM products p
WHERE oi.product_id = p.id AND oi.product_name IS NULL;

-- Optional: Populate cost_price from products table
UPDATE order_items oi
SET cost_price = p.cost_price
FROM products p
WHERE oi.product_id = p.id AND oi.cost_price IS NULL;

-- ── Step 4: audit_log vs audit_logs (make both work) ───────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID,
  user_id       UUID,
  action        TEXT NOT NULL,
  resource_type TEXT,
  resource_id   UUID,
  old_data      JSONB,
  new_data      JSONB,
  ip_address    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optional: Sync data from audit_log to audit_logs if needed (skipped for now)
-- To sync, adjust based on your actual audit_log schema

-- ── Step 5: Add store_id to payments table (missing) ───────────
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS store_id UUID;

-- Optional: Populate store_id from orders
UPDATE payments p
SET store_id = o.store_id
FROM orders o
WHERE p.order_id = o.id AND p.store_id IS NULL;

-- ── Step 6: Create indexes for performance (fix long load times) ─
CREATE INDEX IF NOT EXISTS idx_transactions_store_created ON transactions(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_expenses_store_date ON expenses(store_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_orders_store_status_created ON orders(store_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_store_status_created ON payments(store_id, status, created_at);

-- ── Step 7: Disable RLS (development only) ─────────────────────
ALTER TABLE transactions        DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses            DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs          DISABLE ROW LEVEL SECURITY;

-- ── Step 8: Reload schema cache ─────────────────────────────────
NOTIFY pgrst, 'reload schema';
