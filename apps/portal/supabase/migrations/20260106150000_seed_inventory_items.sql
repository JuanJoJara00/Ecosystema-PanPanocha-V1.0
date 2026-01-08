-- Seed Inventory Items
-- Fixed Version: Matches all columns and LINKS items to Branch Ingredients so they appear in Portal.

DO $$
DECLARE
    v_org_id uuid;
    v_branch_id uuid;
    i int;
    v_type_idx int;
    v_unit inventory_unit;
    v_buying_unit text;
    v_usage_unit text;
    v_conversion_factor numeric;
BEGIN
    -- 1. Get Organization
    SELECT id INTO v_org_id FROM public.organizations LIMIT 1;
    
    IF v_org_id IS NULL THEN
        RAISE NOTICE 'No organization found. Skipping seed.';
        RETURN;
    END IF;

    -- 2. Get Main Branch (needed for visibility in Portal)
    SELECT id INTO v_branch_id FROM public.branches WHERE organization_id = v_org_id ORDER BY created_at ASC LIMIT 1;

    -- [NEW] CLEANUP: Remove compatible existing data to avoid 'Duplicate SKU' errors and ensure clean state
    RAISE NOTICE 'Cleaning up existing inventory for Organization %...', v_org_id;
    
    -- Delete from child table first (foreign key constraint)
    DELETE FROM public.branch_ingredients 
    WHERE branch_id IN (SELECT id FROM public.branches WHERE organization_id = v_org_id);

    -- Delete inventory items
    DELETE FROM public.inventory_items 
    WHERE organization_id = v_org_id;


    -- 3. Insert Raw Materials
    INSERT INTO public.inventory_items (
        name, unit, sku, min_stock_alert, unit_cost, 
        buying_unit, usage_unit, conversion_factor, 
        last_purchase_price, weighted_avg_cost,
        item_type, organization_id
    )
    VALUES 
    -- HARINAS
    ('Harina de Trigo (Bulto a Gramos)', 'g', 'HAR-000', 5000, 3.5, 'Bulto 10kg', 'g', 10000, 35000, 3.5, 'raw_material', v_org_id),
    ('Harina de Trigo Fortificada', 'kg', 'HAR-001', 10, 3500, 'Saco 50kg', 'g', 50000, 3500, 3500, 'raw_material', v_org_id),
    ('Harina de Maíz Precocida', 'kg', 'HAR-002', 8, 4200, 'Saco 25kg', 'g', 25000, 4200, 4200, 'raw_material', v_org_id),
    ('Harina Integral', 'kg', 'HAR-003', 5, 4500, 'Saco 10kg', 'g', 10000, 4500, 4500, 'raw_material', v_org_id),
    ('Fécula de Maíz (Maizena)', 'kg', 'HAR-004', 5, 3800, 'Caja 12kg', 'g', 12000, 3800, 3800, 'raw_material', v_org_id),
    
    -- LÁCTEOS (Liquids -> ml, Solids -> g)
    ('Leche Entera', 'l', 'LAC-001', 20, 3200, 'Caja 12L', 'ml', 12000, 3200, 3200, 'raw_material', v_org_id),
    ('Leche Deslactosada', 'l', 'LAC-002', 10, 3500, 'Caja 12L', 'ml', 12000, 3500, 3500, 'raw_material', v_org_id),
    ('Mantequilla Sin Sal', 'kg', 'LAC-003', 5, 18000, 'Bloque 2.5kg', 'g', 2500, 18000, 18000, 'raw_material', v_org_id),
    ('Margarina Industrial', 'kg', 'LAC-004', 10, 12000, 'Caja 15kg', 'g', 15000, 12000, 12000, 'raw_material', v_org_id),
    ('Queso Mozzarella', 'kg', 'LAC-005', 5, 22000, 'Bloque 2.5kg', 'kg', 2.5, 22000, 22000, 'raw_material', v_org_id),
    ('Queso Costeño', 'kg', 'LAC-006', 5, 19000, 'Bloque', 'kg', 1, 19000, 19000, 'raw_material', v_org_id),
    ('Crema de Leche', 'l', 'LAC-007', 5, 14000, 'Litro', 'l', 1, 14000, 14000, 'raw_material', v_org_id),
    ('Huevos AA', 'caja', 'HUE-001', 10, 16000, 'Caja 30und', 'unidad', 30, 16000, 16000, 'raw_material', v_org_id),
    
    -- ENDULZANTES
    ('Azúcar Blanco', 'kg', 'END-001', 25, 4500, 'Saco 50kg', 'kg', 50, 4500, 4500, 'raw_material', v_org_id),
    ('Azúcar Morena', 'kg', 'END-002', 15, 4800, 'Saco 50kg', 'kg', 50, 4800, 4800, 'raw_material', v_org_id),
    ('Miel de Abejas', 'l', 'END-003', 2, 25000, 'Garrafa', 'l', 1, 25000, 25000, 'raw_material', v_org_id),
    ('Panela Molida', 'kg', 'END-004', 10, 5000, 'Bulto', 'kg', 1, 5000, 5000, 'raw_material', v_org_id),
    
    -- CONDIMENTOS
    ('Sal Refinada', 'kg', 'CON-001', 10, 1500, 'Saco 10kg', 'kg', 10, 1500, 1500, 'raw_material', v_org_id),
    ('Esencia Vainilla', 'l', 'CON-002', 2, 12000, 'Galón', 'l', 3.78, 12000, 12000, 'raw_material', v_org_id),
    ('Canela Molida', 'g', 'CON-003', 500, 35, 'Libra 500g', 'g', 500, 35, 35, 'raw_material', v_org_id),
    ('Polvo de Hornear', 'kg', 'CON-004', 3, 8000, 'Tarro', 'kg', 1, 8000, 8000, 'raw_material', v_org_id),
    ('Levadura Fresca', 'paquete', 'CON-005', 10, 4000, 'Paquete 500g', 'g', 500, 4000, 4000, 'raw_material', v_org_id),
    
    -- RELLENOS Y FRUTAS
    ('Bocadillo Guayaba', 'caja', 'REL-001', 10, 6000, 'Caja', 'kg', 1, 6000, 6000, 'raw_material', v_org_id),
    ('Arequipe Industrial', 'kg', 'REL-002', 5, 11000, 'Balde', 'kg', 5, 11000, 11000, 'raw_material', v_org_id),
    ('Coco Deshidratado', 'kg', 'REL-003', 2, 28000, 'Bolsa', 'kg', 1, 28000, 28000, 'raw_material', v_org_id),
    ('Chocolate Cobertura', 'kg', 'REL-004', 5, 24000, 'Kilo', 'kg', 1, 24000, 24000, 'raw_material', v_org_id),
    
    -- CÁRNICOS
    ('Jamón Pietrán', 'kg', 'CAR-001', 5, 28000, 'Bloque', 'kg', 1, 28000, 28000, 'raw_material', v_org_id),
    ('Tocineta Ahumada', 'kg', 'CAR-002', 3, 35000, 'Paquete', 'kg', 1, 35000, 35000, 'raw_material', v_org_id),
    ('Carne Desmechada', 'kg', 'CAR-003', 5, 25000, 'Kilo', 'kg', 1, 25000, 25000, 'raw_material', v_org_id),
    
    -- SUPPLIES (INSUMOS)
    ('Detergente Líquido', 'l', 'ASE-001', 10, 8000, 'Galón', 'l', 3.78, 8000, 8000, 'supply', v_org_id),
    ('Cloro', 'l', 'ASE-002', 10, 4000, 'Galón', 'l', 3.78, 4000, 4000, 'supply', v_org_id),
    ('Jabón de Manos', 'l', 'ASE-003', 5, 9000, 'Galón', 'l', 3.78, 9000, 9000, 'supply', v_org_id),
    ('Toallas de Manos', 'paquete', 'ASE-004', 20, 5000, 'Paquete 100', 'unidad', 100, 5000, 5000, 'supply', v_org_id),
    ('Bolsas Basura', 'paquete', 'ASE-005', 10, 4500, 'Paquete 10', 'unidad', 10, 4500, 4500, 'supply', v_org_id),
    
    -- EMPAQUES
    ('Bolsa Pan #1', 'paquete', 'EMP-001', 50, 6000, 'Paquete 100', 'unidad', 100, 6000, 6000, 'supply', v_org_id),
    ('Bolsa Pan #2', 'paquete', 'EMP-002', 50, 7000, 'Paquete 100', 'unidad', 100, 7000, 7000, 'supply', v_org_id),
    ('Caja Pizza Pequeña', 'unidad', 'EMP-003', 50, 800, 'Paca 50', 'unidad', 50, 800, 800, 'supply', v_org_id),
    ('Vaso 7oz', 'paquete', 'EMP-004', 20, 4500, 'Paquete 50', 'unidad', 50, 4500, 4500, 'supply', v_org_id),
    ('Servilletas', 'paquete', 'EMP-005', 30, 3500, 'Paquete 100', 'unidad', 100, 3500, 3500, 'supply', v_org_id),
    ('Papel Parafinado', 'caja', 'EMP-006', 5, 25000, 'Caja 1000', 'unidad', 1000, 25000, 25000, 'supply', v_org_id),
    
    -- SEGURIDAD
    ('Guantes Nitrilo M', 'caja', 'SEG-001', 5, 18000, 'Caja 100', 'unidad', 100, 18000, 18000, 'supply', v_org_id),
    ('Tapabocas', 'caja', 'SEG-002', 5, 10000, 'Caja 50', 'unidad', 50, 10000, 10000, 'supply', v_org_id);

    -- GENERATE MORE DATA to reach ~200 items logic with VARIETY
    FOR i IN 1..100 LOOP
        -- Randomize unit
        INSERT INTO public.inventory_items (
            name, unit, sku, min_stock_alert, unit_cost, 
            buying_unit, usage_unit, conversion_factor,
            item_type, organization_id
        ) VALUES (
            'Insumo Variado ' || i,
            CASE (floor(random() * 4))::int
                WHEN 0 THEN 'unidad'
                WHEN 1 THEN 'paquete'
                WHEN 2 THEN 'caja'
                ELSE 'l'
            END::inventory_unit,
            'GEN-' || LPAD(i::text, 3, '0'),
            10,
            (random() * 5000 + 1000)::int,
            'Unidad', 'Unidad', 1,
            'supply',
            v_org_id
        );
    END LOOP;
    
    FOR i IN 1..50 LOOP
        -- Select Random Type (0: Large Solid, 1: Small Solid, 2: Liquid)
        v_type_idx := floor(random() * 3)::int;

        IF v_type_idx = 0 THEN
            -- Saco 25kg -> g
            v_unit := 'g';
            v_buying_unit := 'Saco 25kg';
            v_usage_unit := 'g';
            v_conversion_factor := 25000;
        ELSIF v_type_idx = 1 THEN
            -- Bolsa 500g -> g
            v_unit := 'g';
            v_buying_unit := 'Bolsa 500g';
            v_usage_unit := 'g';
            v_conversion_factor := 500;
        ELSE
            -- Galón -> ml
            v_unit := 'ml';
            v_buying_unit := 'Galón';
            v_usage_unit := 'ml';
            v_conversion_factor := 3785;
        END IF;

        INSERT INTO public.inventory_items (
            name, unit, sku, min_stock_alert, unit_cost, 
            buying_unit, usage_unit, conversion_factor,
            item_type, organization_id
        ) VALUES (
            'Materia Prima Variada ' || i,
            v_unit,
            'MPG-' || LPAD(i::text, 3, '0'),
            100, -- Higher alert since we use small units
            (random() * 50 + 10)::int, -- Cost per gram/ml is low
            v_buying_unit, 
            v_usage_unit,
            v_conversion_factor,
            'raw_material',
            v_org_id
        );
    END LOOP;

    -- 4. LINK ITEMS TO MAIN BRANCH WITH RANDOM STOCK
    IF v_branch_id IS NOT NULL THEN
        INSERT INTO public.branch_ingredients (branch_id, ingredient_id, current_stock, is_active)
        SELECT v_branch_id, id, (floor(random() * 100) + 5)::numeric, true
        FROM public.inventory_items
        WHERE organization_id = v_org_id
        ON CONFLICT (branch_id, ingredient_id) DO UPDATE SET
            current_stock = EXCLUDED.current_stock;
    END IF;

END $$;
