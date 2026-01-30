-- Migration to align Supabase Schema with POS 'Offline-First' Schema
-- Based on apps/pos/electron/db/schema.ts
-- Date: 2026-01-29

-- 1. Sales (Ventas)
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL, -- SaaS Injection
  branch_id uuid NOT NULL REFERENCES branches(id), -- Assuming branches table exists
  shift_id uuid, -- Reference to shifts (created below)
  total_amount decimal(15,2) NOT NULL,
  status text DEFAULT 'completed', -- completed, cancelled, pending
  payment_method text DEFAULT 'cash', -- cash, card, transfer, etc.
  payment_data jsonb, -- Flexible field for card auth codes, etc.
  tip_amount decimal(15,2) DEFAULT 0,
  discount_amount decimal(15,2) DEFAULT 0,
  discount_reason text,
  diners integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by uuid REFERENCES auth.users(id), -- If using Supabase Auth
  sale_channel text, -- POS, RAPPI, WEB, DOMICILIO_INTERNO
  source_device_id text, -- Identifier for the POS terminal
  client_id uuid, -- Optional reference to clients
  synced boolean DEFAULT false
);

-- 2. Sale Items (Detalle de Venta)
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL,
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL, -- References products/inventory_items
  quantity decimal(10,3) NOT NULL, -- Support fractional quantities
  unit_price decimal(15,2) NOT NULL,
  unit_cost decimal(15,2) DEFAULT 0,
  tax_amount decimal(15,2) DEFAULT 0,
  total_price decimal(15,2) NOT NULL
);

-- 3. Shifts (Turnos / Caja)
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL REFERENCES branches(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  initial_cash decimal(15,2) DEFAULT 0,
  final_cash decimal(15,2),
  expected_cash decimal(15,2),
  status text DEFAULT 'open', -- open, closed
  turn_type text, -- morning, evening, etc.
  closing_metadata jsonb, -- Flexible for closing notes/counts
  notes text,
  pending_tips decimal(15,2) DEFAULT 0,
  closed_by_method text,
  deleted_at timestamp with time zone
);

-- 4. Expenses (Gastos Operativos)
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL REFERENCES branches(id),
  shift_id uuid REFERENCES shifts(id) ON DELETE SET NULL, -- Link expense to a shift session
  user_id uuid NOT NULL REFERENCES auth.users(id), -- Who registered the expense
  description text NOT NULL,
  amount decimal(15,2) NOT NULL,
  category text DEFAULT 'general', -- nomina, servicios, arriendo, mantenimiento, insumos_urgentes
  voucher_number text, -- External invoice/receipt number
  authorize_user_id uuid, -- Who authorized (if different)
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  voucher_url text -- URL to uploaded image evidence
);

-- 5. Tip Distributions (Propinas)
CREATE TABLE IF NOT EXISTS tip_distributions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL,
  shift_id uuid NOT NULL REFERENCES shifts(id),
  employee_id uuid, -- Can be null if it's a generic "Kitchen Staff" distribution
  employee_name text, -- Snapshot of name if ID not used
  amount decimal(15,2) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 6. Rappi Deliveries (Specific Rappi Metadata)
-- This table might store webhooks or specific Rappi order details not fit for generic sales
CREATE TABLE IF NOT EXISTS rappi_deliveries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL,
  rappi_order_id text NOT NULL,
  branch_id uuid,
  product_details jsonb, -- Full JSON payload from Rappi
  total_value decimal(15,2) NOT NULL,
  status text DEFAULT 'pending',
  delivery_code text,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS (Row Level Security)
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tip_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rappi_deliveries ENABLE ROW LEVEL SECURITY;

-- Simple Auth Policy (Adjust as needed)
CREATE POLICY "Authenticated users can read all" ON sales FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert" ON sales FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update" ON sales FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read all" ON sale_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert" ON sale_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read all" ON shifts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert" ON shifts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update" ON shifts FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read all" ON expenses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert" ON expenses FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update" ON expenses FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read all" ON tip_distributions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert" ON tip_distributions FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read all" ON rappi_deliveries FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert" ON rappi_deliveries FOR INSERT WITH CHECK (auth.role() = 'authenticated');
