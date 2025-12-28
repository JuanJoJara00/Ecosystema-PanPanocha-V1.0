-- Add order and delivery day fields to suppliers table
-- This allows tracking when to order from suppliers and when they deliver

ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS order_day TEXT,
ADD COLUMN IF NOT EXISTS delivery_day TEXT,
ADD COLUMN IF NOT EXISTS delivery_time_days INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS notes_delivery TEXT;

COMMENT ON COLUMN suppliers.order_day IS 'Day of week to place orders (e.g., "Lunes", "Martes")';
COMMENT ON COLUMN suppliers.delivery_day IS 'Day of week when supplier delivers (e.g., "Miércoles", "Jueves")';
COMMENT ON COLUMN suppliers.delivery_time_days IS 'Number of days between order and delivery (1 = next day, 0 = same day)';
COMMENT ON COLUMN suppliers.notes_delivery IS 'Additional notes about delivery schedule';
