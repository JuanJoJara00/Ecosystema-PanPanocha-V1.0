-- =============================================
-- SEED SAMPLE DATA FOR CIERRE DE CAJA (V3 - Products Included)
-- =============================================
-- This script:
-- 1. Clears existing shifts.
-- 2. Inserts shifts with RICHER metadata (sales_by_category for BOTH PanPanocha and Siigo).
-- 3. Ensures correct dates for visibility.

DO $$
DECLARE
    v_branch_id uuid;
    v_user_id uuid;
    v_today date := CURRENT_DATE;
BEGIN
    -- 1. GET OR CREATE A BRANCH
    SELECT id INTO v_branch_id FROM branches LIMIT 1;
    IF v_branch_id IS NULL THEN
        INSERT INTO branches (name, address, city) 
        VALUES ('Sede Principal', 'Calle 123', 'Bogotá') 
        RETURNING id INTO v_branch_id;
    END IF;

    SELECT id INTO v_user_id FROM auth.users LIMIT 1;

    -- 3. CLEAR OLD DATA
    DELETE FROM shifts;

    -- 4. INSERT SHIFT 1: TODAY (Complete with Products)
    INSERT INTO shifts (
        id, branch_id, user_id, start_time, end_time, initial_cash, final_cash, expected_cash, status, closing_metadata
    ) VALUES (
        gen_random_uuid(), v_branch_id, v_user_id,
        (v_today || ' 08:00:00')::timestamp,
        (v_today || ' 20:00:00')::timestamp,
        200000, 1500000, 1500000, 'closed',
        jsonb_build_object(
            'panpanocha', jsonb_build_object(
                'base_cash', 200000,
                'sales_cash', 1300000,
                'sales_card', 500000,
                'sales_transfer', 200000,
                'expenses_total', 70000,
                'tips_total', 20000,
                'cash_audit_count', 1430000,
                'expected_cash', 1430000,
                'sales_by_category', jsonb_build_object(
                    'Pan de Bono', 450000,
                    'Buñuelos', 300000,
                    'Gaseosas', 250000,
                    'Cafetería', 300000
                )
            ),
            'siigo', jsonb_build_object(
                'base_cash', 200000,
                'sales_cash', 1300000,
                'sales_card', 500000,
                'sales_transfer', 200000,
                'expenses_total', 50000,
                'tips_total', 0,
                'cash_audit_count', 1450000, -- Matches Expected (200k + 1.3m - 50k)
                'expected_cash', 1450000,
                'sales_by_category', jsonb_build_object(
                    'Panadería General', 750000,
                    'Bebidas', 250000,
                    'Café y Tintos', 300000
                )
            ),
            'tips', jsonb_build_object('distributions', '[]'::jsonb)
        )
    );

    -- 5. INSERT SHIFT 2: YESTERDAY (Partial)
    INSERT INTO shifts (
        id, branch_id, user_id, start_time, end_time, initial_cash, final_cash, expected_cash, status, closing_metadata
    ) VALUES (
        gen_random_uuid(), v_branch_id, v_user_id,
        (v_today - INTERVAL '1 day' + INTERVAL '08:00:00'),
        (v_today - INTERVAL '1 day' + INTERVAL '21:00:00'),
        200000, 1200000, 1250000, 'closed',
        jsonb_build_object(
            'panpanocha', jsonb_build_object(
                'base_cash', 200000,
                'sales_cash', 1000000,
                'sales_card', 300000,
                'sales_transfer', 150000,
                'expenses_total', 100000,
                'tips_total', 10000,
                'cash_audit_count', 1090000,
                'expected_cash', 1100000,
                'sales_by_category', jsonb_build_object(
                    'Empanadas', 500000,
                    'Jugos Naturales', 300000,
                    'Pastelería', 200000
                )
            ),
            'siigo', null -- Missing Siigo
        )
    );
END $$;
