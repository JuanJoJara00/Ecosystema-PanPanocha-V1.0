-- Add missing columns to suppliers table if they don't exist
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS order_day TEXT,
ADD COLUMN IF NOT EXISTS delivery_day TEXT,
ADD COLUMN IF NOT EXISTS delivery_time_days INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS notes_delivery TEXT;

-- Add indexes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_suppliers_order_day') THEN
        CREATE INDEX idx_suppliers_order_day ON suppliers(order_day);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_suppliers_delivery_day') THEN
        CREATE INDEX idx_suppliers_delivery_day ON suppliers(delivery_day);
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN suppliers.order_day IS 'Day of week to place orders (e.g., "Lunes", "Martes")';
COMMENT ON COLUMN suppliers.delivery_day IS 'Day of week when supplier delivers (e.g., "Miércoles", "Jueves")';
COMMENT ON COLUMN suppliers.delivery_time_days IS 'Number of days between order and delivery (1 = next day, 0 = same day)';
COMMENT ON COLUMN suppliers.notes_delivery IS 'Additional notes about delivery schedule';
