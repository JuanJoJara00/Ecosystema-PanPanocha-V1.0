-- ARCHIVO: supabase/migrations/20250102000000_inventory_deduction.sql

-- 0. Ensure sale_items exists (Resilience)
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER DEFAULT 1,
    unit_price Decimal(12,2) DEFAULT 0,
    total_price Decimal(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Ensure products has stock column (per Audit recommendation)
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;

-- 2. Create Function for Deduction
CREATE OR REPLACE FUNCTION deduct_inventory_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Deduct from the global product stock (as per Audit simplified model)
  UPDATE products
  SET stock = stock - NEW.quantity
  WHERE id = NEW.product_id;
  
  -- FUTURE: Implement branch_inventory deduction here by joining sales table.
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger
DROP TRIGGER IF EXISTS trigger_deduct_stock ON sale_items;

CREATE TRIGGER trigger_deduct_stock
AFTER INSERT ON sale_items
FOR EACH ROW
EXECUTE FUNCTION deduct_inventory_on_sale();
