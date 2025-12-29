-- Migration: 20251229000001_inject_identity.sql

DO $$
DECLARE
    -- Lista exhaustiva de tablas a migrar basada en la auditoría
    tables TEXT := ARRAY[
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
        -- Verificar si la tabla existe antes de intentar modificarla
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            
            -- 1. Agregar la columna como NULLABLE inicialmente
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);', tbl);
            
            -- 2. Backfill: Asignar datos existentes a la Organización Legada
            -- Esto previene la pérdida de datos y prepara para la restricción NOT NULL
            EXECUTE format('UPDATE %I SET organization_id = ''00000000-0000-0000-0000-000000000000'' WHERE organization_id IS NULL;', tbl);
            
            -- 3. Endurecimiento: Establecer restricción NOT NULL
            EXECUTE format('ALTER TABLE %I ALTER COLUMN organization_id SET NOT NULL;', tbl);
            
            -- 4. Rendimiento: Crear Índice B-Tree para RLS
            EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_org_id ON %I(organization_id);', tbl, tbl);
            
            -- 5. Seguridad: Habilitar RLS explícitamente (redundancia de seguridad)
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
            
            RAISE NOTICE 'Tabla % migrada exitosamente a Multi-Tenancy.', tbl;
        ELSE
            RAISE NOTICE 'Tabla % no encontrada, saltando...', tbl;
        END IF;
    END LOOP;
END $$;

-- Actualizar restricción de unicidad para product_categories
-- Antes: UNIQUE(name) -> Ahora: UNIQUE(organization_id, name)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product_categories') THEN
        ALTER TABLE product_categories DROP CONSTRAINT IF EXISTS product_categories_name_key;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_org_name ON product_categories(organization_id, name);
    END IF;
END $$;
