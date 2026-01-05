-- ============================================
-- SAMPLE DATA FOR CIERRE DE CAJA MODULE
-- ============================================
-- Purpose: Create test shifts for Portal testing
-- Date: 2026-01-05

-- Note: Replace these UUIDs with your actual branch_id and user_id from your database
-- You can get them by running: SELECT id, name FROM branches; and SELECT id FROM users LIMIT 1;

-- Variables (UPDATE THESE WITH YOUR ACTUAL IDs)
-- branch_id: Get from `SELECT id, name FROM branches;`
-- user_id: Get from `SELECT id FROM users WHERE role = 'owner' LIMIT 1;`

-- ============================================
-- SAMPLE SHIFTS (Last 30 Days)
-- ============================================

-- Shift 1: Recent closing (Today - 1 day)
INSERT INTO shifts (
    id,
    branch_id,
    user_id,
    organization_id,
    start_time,
    end_time,
    turn_type,
    initial_cash,
   final_cash,
    expected_cash,
    status,
    closing_metadata,
    created_at,
    updated_at,
    synced
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM branches LIMIT 1),  -- Replace with actual branch_id
    (SELECT id FROM users WHERE role = 'owner' LIMIT 1),  -- Replace with actual user_id
    (SELECT organization_id FROM users WHERE role = 'owner' LIMIT 1),
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day' + INTERVAL '8 hours',
    'morning',
    100000,  -- Initial: $100,000
    650000,  -- Final: $650,000
    650000,  -- Expected: $650,000
    'closed',
    jsonb_build_object(
        'mys', jsonb_build_object(
            'base_cash', 100000,
            'sales_cash', 350000,
            'sales_card', 150000,
            'sales_transfer', 50000,
            'expenses_total', 30000,
            'tips_total', 20000,
            'cash_audit_count', 650000,
            'notes', 'Cierre de prueba - Día normal'
        )
    ),
    NOW(),
    NOW(),
    true
);

-- Shift 2: Yesterday afternoon
INSERT INTO shifts (
    id,
    branch_id,
    user_id,
    organization_id,
    start_time,
    end_time,
    turn_type,
    initial_cash,
    final_cash,
    expected_cash,
    status,
    closing_metadata,
    created_at,
    updated_at,
    synced
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM branches LIMIT 1),
    (SELECT id FROM users WHERE role = 'owner' LIMIT 1),
    (SELECT organization_id FROM users WHERE role = 'owner' LIMIT 1),
    NOW() - INTERVAL '13 hours',
    NOW() - INTERVAL '5 hours',
    'afternoon',
    100000,
    520000,
    520000,
    'closed',
    jsonb_build_object(
        'mys', jsonb_build_object(
            'base_cash', 100000,
            'sales_cash', 280000,
            'sales_card', 120000,
            'sales_transfer', 40000,
            'expenses_total', 15000,
            'tips_total', 5000,
            'cash_audit_count', 520000
        )
    ),
    NOW(),
    NOW(),
    true
);

-- Shift 3: 5 days ago with Siigo data
INSERT INTO shifts (
    id,
    branch_id,
    user_id,
    organization_id,
    start_time,
    end_time,
    turn_type,
    initial_cash,
    final_cash,
    expected_cash,
    status,
    closing_metadata,
    created_at,
    updated_at,
    synced
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM branches LIMIT 1),
    (SELECT id FROM users WHERE role = 'owner' LIMIT 1),
    (SELECT organization_id FROM users WHERE role = 'owner' LIMIT 1),
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days' + INTERVAL '8 hours',
    'morning',
    100000,
    700000,
    700000,
    'closed',
    jsonb_build_object(
        'mys', jsonb_build_object(
            'base_cash', 100000,
            'sales_cash', 400000,
            'sales_card', 180000,
            'sales_transfer', 60000,
            'expenses_total', 25000,
            'tips_total', 15000,
            'cash_audit_count', 700000
        ),
        'siigo', jsonb_build_object(
            'base_cash', 50000,
            'sales_cash', 200000,
            'sales_card', 100000,
            'sales_transfer', 30000,
            'expenses_total', 10000,
            'tips_total', 5000,
            'cash_audit_count', 235000,
            'dataphone_voucher_url', 'https://example.com/voucher.jpg',
            'pos_invoice_url', 'https://example.com/invoice.pdf'
        )
    ),
    NOW(),
    NOW(),
    true
);

-- Shift 4: 10 days ago
INSERT INTO shifts (
    id,
    branch_id,
    user_id,
    organization_id,
    start_time,
    end_time,
    turn_type,
    initial_cash,
    final_cash,
    expected_cash,
    status,
    closing_metadata,
    created_at,
    updated_at,
    synced
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM branches LIMIT 1),
    (SELECT id FROM users WHERE role = 'owner' LIMIT 1),
    (SELECT organization_id FROM users WHERE role = 'owner' LIMIT 1),
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days' + INTERVAL '9 hours',
    'afternoon',
    100000,
    480000,
    480000,
    'closed',
    jsonb_build_object(
        'mys', jsonb_build_object(
            'base_cash', 100000,
            'sales_cash', 250000,
            'sales_card', 110000,
            'sales_transfer', 35000,
            'expenses_total', 10000,
            'tips_total', 5000,
            'cash_audit_count', 480000
        )
    ),
    NOW(),
    NOW(),
    true
);

-- Shift 5: 15 days ago (with difference/shortage)
INSERT INTO shifts (
    id,
    branch_id,
    user_id,
    organization_id,
    start_time,
    end_time,
    turn_type,
    initial_cash,
    final_cash,
    expected_cash,
    status,
    closing_metadata,
    created_at,
    updated_at,
    synced
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM branches LIMIT 1),
    (SELECT id FROM users WHERE role = 'owner' LIMIT 1),
    (SELECT organization_id FROM users WHERE role = 'owner' LIMIT 1),
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days' + INTERVAL '8 hours',
    'morning',
    100000,
    545000,  -- Shortage of $5,000
    550000,
    'closed',
    jsonb_build_object(
        'mys', jsonb_build_object(
            'base_cash', 100000,
            'sales_cash', 300000,
            'sales_card', 130000,
            'sales_transfer', 45000,
            'expenses_total', 20000,
            'tips_total', 5000,
            'cash_audit_count', 545000,
            'notes', 'Cierre con faltante de $5,000'
        )
    ),
    NOW(),
    NOW(),
    true
);

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify the data was inserted:

SELECT 
    id,
    start_time::date as fecha,
    turn_type,
    initial_cash,
    final_cash,
    expected_cash,
    status,
    (closing_metadata->'mys'->>'sales_cash')::numeric as mys_sales
FROM shifts
WHERE status = 'closed'
ORDER BY start_time DESC
LIMIT 10;
