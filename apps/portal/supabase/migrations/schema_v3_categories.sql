-- 1. Create Product Categories Table
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Categories
INSERT INTO product_categories (name) VALUES 
('Panochas'), 
('Panadería'), 
('Para Picar & Compartir'), 
('Típicos'), 
('Bebidas Calientes'), 
('Bebidas Frías')
ON CONFLICT (name) DO NOTHING;

-- 2. Modify Products Table to use Category ID
-- Add column first
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id);

-- (Optional) If we had data, we would migrate it here, but assuming it's fresh/test data we can just drop the old column later.
-- For now, let's keep both until migration is verified.

-- 3. Create Branch Products Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS branch_products (
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    price_override NUMERIC, -- Optional, if price differs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (branch_id, product_id)
);

-- 4. RLS Update
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_products ENABLE ROW LEVEL SECURITY;

-- Categories Policies
CREATE POLICY "Enable read for authenticated users" ON product_categories
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable write for authenticated users" ON product_categories
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Branch Products Policies
CREATE POLICY "Enable all for authenticated users" ON branch_products
FOR ALL TO authenticated USING (true) WITH CHECK (true);
