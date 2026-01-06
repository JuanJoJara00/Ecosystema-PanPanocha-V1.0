-- =============================================
-- SEED SAMPLE DATA FOR CIERRE DE CAJA (UPDATED)
-- =============================================
-- This script:
-- 1. clearing existing shifts to avoid clutter
-- 2. Inserts sample shifts for "Today" and previous days
-- 3. Includes rich JSON 'closing_metadata' to verify the new UI features

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

    -- 2. GET OR CREATE A USER (Generic Admin)
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    -- If no auth user exists, we can't easily fake one due to FKs usually, 
    -- but if shifts.user_id is nullable or we have one, we use it.
    -- If NULL, we'll try to insert without it (if constraint allows) or skip.
    -- Assuming at least one user exists in a dev env.

    -- 3. CLEAR OLD DATA (Optional - Remove if you want to keep history)
    DELETE FROM shifts;

    -- 4. INSERT SHIFT 1: TODAY (Complete with Diff)
    -- This shift has perfect match between PanPanocha and Siigo, but maybe a small cash difference
    INSERT INTO shifts (
        id, 
        branch_id, 
        user_id, 
        start_time, 
        end_time, 
        initial_cash, 
        final_cash, 
        expected_cash, 
        status, 
        closing_metadata
    ) VALUES (
        gen_random_uuid(),
        v_branch_id,
        v_user_id,
        (v_today || ' 08:00:00')::timestamp,
        (v_today || ' 20:00:00')::timestamp,
        200000, -- Base
        1500000, -- Final Cash (User Counted)
        1500000, -- Expected (System Calc)
        'closed',
        jsonb_build_object(
            'panpanocha', jsonb_build_object(
                'base_cash', 200000,
                'sales_cash', 1300000,
                'sales_card', 500000,
                'sales_transfer', 200000,
                'expenses_total', 50000,
                'tips_total', 20000,
                'cash_audit_count', 1430000, -- Real cash found (Match: Base + Sales - Exp - Tips = 200k + 1.3M - 50k - 20k = 1.43M)
                'sales_count', 150
            ),
            'siigo', jsonb_build_object(
                'base_cash', 200000,
                'sales_cash', 1300000,
                'sales_card', 500000,
                'sales_transfer', 200000,
                'expenses_total', 0, -- Siigo often doesn't track expenses same way
                'tips_total', 0,
                'cash_audit_count', 1500000 
            ),
            'tips', jsonb_build_object(
                'distributions', '[]'::jsonb
            )
        )
    );

    -- 5. INSERT SHIFT 2: YESTERDAY (Partial / Missing Siigo or mismatch)
    INSERT INTO shifts (
        id, 
        branch_id, 
        user_id, 
        start_time, 
        end_time, 
        initial_cash, 
        final_cash, 
        expected_cash, 
        status, 
        closing_metadata
    ) VALUES (
        gen_random_uuid(),
        v_branch_id,
        v_user_id,
        (v_today - INTERVAL '1 day' + INTERVAL '08:00:00'),
        (v_today - INTERVAL '1 day' + INTERVAL '21:00:00'),
        200000,
        1200000,
        1250000,
        'closed',
        jsonb_build_object(
            'panpanocha', jsonb_build_object(
                'base_cash', 200000,
                'sales_cash', 1000000,
                'sales_card', 300000,
                'sales_transfer', 150000,
                'expenses_total', 100000,
                'tips_total', 10000,
                'cash_audit_count', 1090000, -- Expected: 200+1000-100-10 = 1090. Match.
                'sales_count', 120
            ),
            'siigo', null -- Missing Siigo data (Test Partial UI)
        )
    );

    -- 6. INSERT SHIFT 3: 2 DAYS AGO (Big Discrepancy)
    INSERT INTO shifts (
        id, 
        branch_id, 
        user_id, 
        start_time, 
        end_time, 
        initial_cash, 
        final_cash, 
        expected_cash, 
        status, 
        closing_metadata
    ) VALUES (
        gen_random_uuid(),
        v_branch_id,
        v_user_id,
        (v_today - INTERVAL '2 days' + INTERVAL '08:00:00'),
        (v_today - INTERVAL '2 days' + INTERVAL '20:00:00'),
        200000,
        800000,
        900000,
        'closed',
        jsonb_build_object(
            'panpanocha', jsonb_build_object(
                'base_cash', 200000,
                'sales_cash', 800000,
                'sales_card', 200000,
                'sales_transfer', 50000,
                'expenses_total', 20000,
                'tips_total', 5000,
                'cash_audit_count', 800000 -- Real count
                -- Expected: 200 + 800 - 20 - 5 = 975k.
                -- Diff: 800 - 975 = -175k (Negative Red)
            ),
            'siigo', jsonb_build_object(
                'base_cash', 200000,
                'sales_cash', 850000, -- Siigo shows MORE sales (Theft?)
                'sales_card', 200000,
                'sales_transfer', 50000,
                'expenses_total', 0,
                'tips_total', 0,
                'cash_audit_count', 1050000
            )
        )
    );

END $$;
