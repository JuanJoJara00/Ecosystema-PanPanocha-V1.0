-- 1. Create Products Table (Safe Mode)
-- We check if it exists, and if so, we just add missing columns
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='category') THEN
        ALTER TABLE products ADD COLUMN category TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='price') THEN
        ALTER TABLE products ADD COLUMN price NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='active') THEN
        ALTER TABLE products ADD COLUMN active BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image_url') THEN
        ALTER TABLE products ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- 2. Create Product Recipes Table (Ingredients per Product)
CREATE TABLE IF NOT EXISTS product_recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity_required NUMERIC NOT NULL, -- Amount needed per 1 unit of product
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Daily Production/Sales Logs
CREATE TABLE IF NOT EXISTS production_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  quantity_produced NUMERIC NOT NULL,
  production_date DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) - Safe to run multiple times
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (Drop first to avoid conflicts if re-running)

-- Products
DROP POLICY IF EXISTS "Enable all for authenticated users" ON products;
CREATE POLICY "Enable all for authenticated users" ON products 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Recipes
DROP POLICY IF EXISTS "Enable all for authenticated users" ON product_recipes;
CREATE POLICY "Enable all for authenticated users" ON product_recipes
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Production Logs
DROP POLICY IF EXISTS "Enable all for authenticated users" ON production_logs;
CREATE POLICY "Enable all for authenticated users" ON production_logs
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Helper View
CREATE OR REPLACE VIEW view_product_details AS
SELECT 
    p.id, 
    p.name, 
    p.category, 
    p.price,
    (SELECT COUNT(*) FROM product_recipes pr WHERE pr.product_id = p.id) as ingredient_count
FROM products p;
