-- Migration: 20251229000002_enable_rls.sql

-- 1. Función optimizada para obtener el ID de organización del usuario actual
CREATE OR REPLACE FUNCTION get_auth_org_id()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    -- Intento 1: Obtener de claims JWT (Optimización futura para alto rendimiento)
    -- org_id := (auth.jwt() ->> 'organization_id')::UUID;
    -- IF org_id IS NOT NULL THEN RETURN org_id; END IF;

    -- Intento 2: Consulta directa a profiles (Estándar actual)
    SELECT organization_id INTO org_id
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Macro para aplicar políticas masivamente
DO $$
DECLARE
    tables TEXT[] := ARRAY[
        'profiles', 'branches', 'products', 'inventory_items', 
        'branch_inventory', 'suppliers', 'purchase_orders', 
        'cash_closings', 'employees', 'payroll', 'clients',
        'sales', 'sale_items', 'orders', 'order_items', 
        'shifts', 'expenses', 'deliveries', 'rappi_deliveries',
        'stock_reservations', 'product_categories'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            
            -- Eliminar políticas existentes si las hubiera para evitar conflictos
            EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Select" ON %I;', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Insert" ON %I;', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Update" ON %I;', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Delete" ON %I;', tbl);

            -- 1. SELECT: Aislamiento de lectura
            EXECUTE format('CREATE POLICY "Tenant Isolation Select" ON %I FOR SELECT USING (organization_id = get_auth_org_id());', tbl);

            -- 2. INSERT: Aislamiento de escritura
            EXECUTE format('CREATE POLICY "Tenant Isolation Insert" ON %I FOR INSERT WITH CHECK (organization_id = get_auth_org_id());', tbl);

            -- 3. UPDATE: Aislamiento de modificación
            EXECUTE format('CREATE POLICY "Tenant Isolation Update" ON %I FOR UPDATE USING (organization_id = get_auth_org_id());', tbl);

            -- 4. DELETE: Aislamiento de eliminación
            EXECUTE format('CREATE POLICY "Tenant Isolation Delete" ON %I FOR DELETE USING (organization_id = get_auth_org_id());', tbl);
            
            RAISE NOTICE 'RLS activado para tabla %.', tbl;
        END IF;
    END LOOP;
END $$;
