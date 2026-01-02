-- Migration: Tenant Isolation (RLS)
-- Date: 2025-01-03

-- 1. Extend Profiles to include Branch Context
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id);

-- Optional: Set default branch for existing users if any (to avoid lockout)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM profiles WHERE branch_id IS NULL) THEN
        UPDATE profiles SET branch_id = (SELECT id FROM branches ORDER BY created_at ASC LIMIT 1) WHERE branch_id IS NULL;
    END IF;
END $$;

-- 2. Define RLS Helper Policy (Standard Isolation)
-- We'll use a standard pattern for all tables:
-- "Users can only view/modify data belonging to their assigned branch"

-- 3. Apply to Tables

-- --- INVENTORY ITEMS ---
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Branch Isolation" ON inventory_items;
-- Inventory items are global or per branch? 
-- schema.ts says: inventory_items has NO branch_id? 
-- Wait, schema.ts `products` has no branch_id (global catalog).
-- `inventory_items` in schema.ts HAS NO branch_id?
-- `branch_inventory` HAS branch_id.
-- So `inventory_items` (Catalog) might be shared?
-- If shared, then ALL authenticated users can read.
-- Only Admins can edit?
-- Let's stick to "Enable all access for authenticated users" for CATALOG tables (products, inventory_items).
-- But `branch_inventory` MUST be isolated.

ALTER TABLE branch_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Branch Isolation" ON branch_inventory;
CREATE POLICY "Branch Isolation" ON branch_inventory
    USING (branch_id IN (SELECT branch_id FROM profiles WHERE id = auth.uid()))
    WITH CHECK (branch_id IN (SELECT branch_id FROM profiles WHERE id = auth.uid()));


-- --- SALES (Create if missing, matching PowerSync Schema) ---
CREATE TABLE IF NOT EXISTS sales (
  id text PRIMARY KEY, -- text/uuid
  organization_id text,
  branch_id uuid NOT NULL REFERENCES branches(id),
  shift_id uuid, -- REFERENCES shifts(id)
  total_amount decimal(10,2) NOT NULL,
  status text DEFAULT 'completed',
  payment_method text DEFAULT 'cash',
  payment_data text,
  tip_amount decimal(10,2) DEFAULT 0,
  discount_amount decimal(10,2) DEFAULT 0,
  discount_reason text,
  diners integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  sale_channel text,
  source_device_id text,
  created_by_system text,
  client_id text, -- link to clients
  synced boolean DEFAULT false
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Branch Isolation" ON sales;
CREATE POLICY "Branch Isolation" ON sales
    USING (branch_id IN (SELECT branch_id FROM profiles WHERE id = auth.uid()))
    WITH CHECK (branch_id IN (SELECT branch_id FROM profiles WHERE id = auth.uid()));


-- --- SALE ITEMS ---
CREATE TABLE IF NOT EXISTS sale_items (
    id text PRIMARY KEY,
    organization_id text,
    sale_id text NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id),
    quantity decimal(10,2) NOT NULL,
    unit_price decimal(10,2) NOT NULL,
    unit_cost decimal(10,2) DEFAULT 0,
    tax_amount decimal(10,2) DEFAULT 0,
    total_price decimal(10,2) NOT NULL
);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
-- Optimization: Denormalize branch_id to sale_items for RLS performance
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

-- Backfill branch_id from sales
UPDATE sale_items 
SET branch_id = sales.branch_id 
FROM sales 
WHERE sale_items.sale_id = sales.id 
AND sale_items.branch_id IS NULL;

-- Enforce branch_id (Optional but recommended if data is clean)
-- ALTER TABLE sale_items ALTER COLUMN branch_id SET NOT NULL; 

DROP POLICY IF EXISTS "Branch Isolation" ON sale_items;
CREATE POLICY "Branch Isolation" ON sale_items
    USING (branch_id IN (SELECT branch_id FROM profiles WHERE id = auth.uid()))
    WITH CHECK (branch_id IN (SELECT branch_id FROM profiles WHERE id = auth.uid()));


-- --- SHIFTS (or cash_closings) ---
-- If 'shifts' doesn't exist, we assume 'cash_closings' is the one, or we create 'shifts'.
-- POS uses 'shifts'. If we create 'shifts' table, does it conflict with 'cash_closings'?
-- Let's create 'shifts' if missing to support POS.
CREATE TABLE IF NOT EXISTS shifts (
    id text PRIMARY KEY,
    organization_id text,
    branch_id uuid NOT NULL REFERENCES branches(id),
    user_id uuid NOT NULL REFERENCES profiles(id),
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    initial_cash decimal(10,2) DEFAULT 0,
    final_cash decimal(10,2),
    expected_cash decimal(10,2),
    status text DEFAULT 'open',
    turn_type text,
    closing_metadata text,
    notes text,
    pending_tips decimal(10,2) DEFAULT 0,
    synced boolean DEFAULT false,
    deleted_at timestamp with time zone
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Branch Isolation" ON shifts;
CREATE POLICY "Branch Isolation" ON shifts
    USING (branch_id IN (SELECT branch_id FROM profiles WHERE id = auth.uid()))
    WITH CHECK (branch_id IN (SELECT branch_id FROM profiles WHERE id = auth.uid()));


-- --- EXPENSES ---
CREATE TABLE IF NOT EXISTS expenses (
    id text PRIMARY KEY,
    organization_id text,
    branch_id uuid NOT NULL REFERENCES branches(id),
    shift_id text REFERENCES shifts(id),
    user_id uuid NOT NULL REFERENCES profiles(id),
    description text NOT NULL,
    amount decimal(10,2) NOT NULL,
    category text DEFAULT 'general',
    voucher_number text,
    authorize_user_id text,
    created_at timestamp with time zone,
    synced boolean DEFAULT false
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Branch Isolation" ON expenses;
CREATE POLICY "Branch Isolation" ON expenses
    USING (branch_id IN (SELECT branch_id FROM profiles WHERE id = auth.uid()))
    WITH CHECK (branch_id IN (SELECT branch_id FROM profiles WHERE id = auth.uid()));


-- --- DELIVERIES ---
CREATE TABLE IF NOT EXISTS deliveries (
    id text PRIMARY KEY,
    organization_id text,
    branch_id uuid NOT NULL REFERENCES branches(id),
    customer_name text NOT NULL,
    customer_phone text,
    customer_address text NOT NULL,
    product_details text,
    delivery_fee decimal(10,2) DEFAULT 0,
    status text DEFAULT 'pending',
    assigned_driver text,
    created_at timestamp with time zone,
    synced boolean DEFAULT false
);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Branch Isolation" ON deliveries;
CREATE POLICY "Branch Isolation" ON deliveries
    USING (branch_id IN (SELECT branch_id FROM profiles WHERE id = auth.uid()))
    WITH CHECK (branch_id IN (SELECT branch_id FROM profiles WHERE id = auth.uid()));

