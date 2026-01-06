-- ============================================
-- ADD MISSING POS TABLES TO SUPABASE
-- ============================================
-- Purpose: Create tables in Supabase that exist in POS local schema
--          to enable full bi-directional sync via PowerSync
-- Date: 2026-01-06

-- 1. DEVICES (Device Registry for POS Terminals)
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive', 'revoked')),
    type TEXT DEFAULT 'pos_terminal',
    fingerprint TEXT,
    app_version TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- 2. ORDERS (Table/Pending Orders - NOT purchase_orders)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES branches(id),
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    table_id UUID,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    created_by UUID,
    total_amount DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'served', 'cancelled', 'completed')),
    customer_name TEXT,
    diners INTEGER DEFAULT 1,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    synced BOOLEAN DEFAULT FALSE
);

-- 3. ORDER_ITEMS (Items in a pending order)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    notes TEXT
);

-- 4. TABLES (Restaurant Floor Tables)
CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
    capacity INTEGER DEFAULT 4,
    zone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- 5. TIP_DISTRIBUTIONS (Employee tip payouts)
CREATE TABLE IF NOT EXISTS tip_distributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID NOT NULL,
    employee_name TEXT,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    synced BOOLEAN DEFAULT FALSE
);

-- 6. STOCK_RESERVATIONS (Pending reservations for cart/orders)
CREATE TABLE IF NOT EXISTS stock_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('order', 'cart', 'delivery')),
    source_id UUID NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'released')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. RAPPI_DELIVERIES (Third-party delivery orders)
CREATE TABLE IF NOT EXISTS rappi_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    rappi_order_id TEXT NOT NULL,
    branch_id UUID REFERENCES branches(id),
    product_details TEXT,
    total_value DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled')),
    delivery_code TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    synced BOOLEAN DEFAULT FALSE
);

-- ============================================
-- ENABLE RLS ON NEW TABLES
-- ============================================
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE tip_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rappi_deliveries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT ALL ON TABLE devices TO authenticated;
GRANT ALL ON TABLE devices TO service_role;
GRANT ALL ON TABLE orders TO authenticated;
GRANT ALL ON TABLE orders TO service_role;
GRANT ALL ON TABLE order_items TO authenticated;
GRANT ALL ON TABLE order_items TO service_role;
GRANT ALL ON TABLE tables TO authenticated;
GRANT ALL ON TABLE tables TO service_role;
GRANT ALL ON TABLE tip_distributions TO authenticated;
GRANT ALL ON TABLE tip_distributions TO service_role;
GRANT ALL ON TABLE stock_reservations TO authenticated;
GRANT ALL ON TABLE stock_reservations TO service_role;
GRANT ALL ON TABLE rappi_deliveries TO authenticated;
GRANT ALL ON TABLE rappi_deliveries TO service_role;

-- ============================================
-- ADD TO POWERSYNC PUBLICATION
-- ============================================
ALTER PUBLICATION powersync ADD TABLE devices;
ALTER PUBLICATION powersync ADD TABLE orders;
ALTER PUBLICATION powersync ADD TABLE order_items;
ALTER PUBLICATION powersync ADD TABLE tables;
ALTER PUBLICATION powersync ADD TABLE tip_distributions;
ALTER PUBLICATION powersync ADD TABLE stock_reservations;
ALTER PUBLICATION powersync ADD TABLE rappi_deliveries;

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_orders_organization ON orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_branch ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_shift ON orders(shift_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_tables_branch ON tables(branch_id);
CREATE INDEX IF NOT EXISTS idx_tip_distributions_shift ON tip_distributions(shift_id);
CREATE INDEX IF NOT EXISTS idx_tip_distributions_employee ON tip_distributions(employee_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_product ON stock_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_rappi_deliveries_branch ON rappi_deliveries(branch_id);
