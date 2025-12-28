-- Create suppliers table if it doesn't exist
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    tax_id VARCHAR(50),
    payment_terms VARCHAR(100),
    category VARCHAR(100),
    order_day TEXT,
    delivery_day TEXT,
    delivery_time_days INTEGER DEFAULT 1,
    notes_delivery TEXT,
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(active);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(category);
CREATE INDEX IF NOT EXISTS idx_suppliers_order_day ON suppliers(order_day);
CREATE INDEX IF NOT EXISTS idx_suppliers_delivery_day ON suppliers(delivery_day);

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY IF NOT EXISTS "Enable all access for authenticated users" ON suppliers
    FOR ALL
    USING (auth.role() = 'authenticated');

COMMENT ON TABLE suppliers IS 'Suppliers/vendors for purchase orders';
COMMENT ON COLUMN suppliers.order_day IS 'Day of week to place orders (e.g., "Lunes", "Martes")';
COMMENT ON COLUMN suppliers.delivery_day IS 'Day of week when supplier delivers (e.g., "Miércoles", "Jueves")';
COMMENT ON COLUMN suppliers.delivery_time_days IS 'Number of days between order and delivery (1 = next day, 0 = same day)';
COMMENT ON COLUMN suppliers.notes_delivery IS 'Additional notes about delivery schedule';
