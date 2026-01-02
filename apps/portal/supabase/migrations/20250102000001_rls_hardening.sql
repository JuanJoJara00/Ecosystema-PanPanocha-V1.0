-- ARCHIVO: supabase/migrations/20250102000001_rls_hardening.sql

-- Hardening Siigo Closings RLS
-- Replacing permissive "using (true)" with branch-scoped checks.

-- 1. Siigo Closings
ALTER TABLE siigo_closings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON siigo_closings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON siigo_closings;

CREATE POLICY "Strict Branch Access Select" ON siigo_closings
FOR SELECT TO authenticated
USING (
  branch_id = (auth.jwt() ->> 'branch_id')::uuid
  OR 
  (auth.jwt() ->> 'role') = 'admin'
);

CREATE POLICY "Strict Branch Access Insert" ON siigo_closings
FOR INSERT TO authenticated
WITH CHECK (
  branch_id = (auth.jwt() ->> 'branch_id')::uuid
  OR 
  (auth.jwt() ->> 'role') = 'admin'
);

-- 2. Siigo Closing Products (Child Table, inherit security via Join)
ALTER TABLE siigo_closing_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON siigo_closing_products;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON siigo_closing_products;

CREATE POLICY "Strict Branch Access Select" ON siigo_closing_products
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM siigo_closings 
    WHERE id = siigo_closing_products.closing_id 
    AND (
      branch_id = (auth.jwt() ->> 'branch_id')::uuid
      OR (auth.jwt() ->> 'role') = 'admin'
    )
  )
);

CREATE POLICY "Strict Branch Access Insert" ON siigo_closing_products
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM siigo_closings 
    WHERE id = siigo_closing_products.closing_id 
    AND (
      branch_id = (auth.jwt() ->> 'branch_id')::uuid
      OR (auth.jwt() ->> 'role') = 'admin'
    )
  )
);

-- 3. Siigo Closing Movements (Child Table)
ALTER TABLE siigo_closing_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON siigo_closing_movements;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON siigo_closing_movements;

CREATE POLICY "Strict Branch Access Select" ON siigo_closing_movements
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM siigo_closings 
    WHERE id = siigo_closing_movements.closing_id 
    AND (
      branch_id = (auth.jwt() ->> 'branch_id')::uuid
      OR (auth.jwt() ->> 'role') = 'admin'
    )
  )
);

CREATE POLICY "Strict Branch Access Insert" ON siigo_closing_movements
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM siigo_closings 
    WHERE id = siigo_closing_movements.closing_id 
    AND (
      branch_id = (auth.jwt() ->> 'branch_id')::uuid
      OR (auth.jwt() ->> 'role') = 'admin'
    )
  )
);
