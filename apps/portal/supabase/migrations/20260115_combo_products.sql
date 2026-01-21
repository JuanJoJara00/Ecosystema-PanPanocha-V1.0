-- 1. Add 'type' column to products if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='type') THEN
        ALTER TABLE products ADD COLUMN type TEXT DEFAULT 'standard';
    END IF;
END $$;

-- 2. Create product_combos table
CREATE TABLE IF NOT EXISTS product_combos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    child_product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Prevent duplicate child in same parent
    UNIQUE(parent_product_id, child_product_id)
);

-- 3. Enable RLS
ALTER TABLE product_combos ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policy
DROP POLICY IF EXISTS "Enable all for authenticated users" ON product_combos;
CREATE POLICY "Enable all for authenticated users" ON product_combos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Add comment
COMMENT ON TABLE product_combos IS 'Links a parent Combo product to its component child products';
