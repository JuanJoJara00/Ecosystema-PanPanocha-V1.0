-- ============================================
-- QUICK SAMPLE DATA - RUN THIS IN SUPABASE SQL EDITOR
-- ============================================
-- This creates 5 test shifts for the current month

-- Shift 1: Yesterday Morning ($550K total sales)
INSERT INTO shifts (branch_id, user_id, organization_id, start_time, end_time, turn_type, initial_cash, final_cash, expected_cash, status, closing_metadata, created_at, updated_at, synced)
SELECT 
    b.id,
    u.id,
    u.organization_id,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day' + INTERVAL '8 hours',
    'morning',
    100000,
    650000,
    650000,
    'closed',
    '{"mys": {"base_cash": 100000, "sales_cash": 350000, "sales_card": 150000, "sales_transfer": 50000, "expenses_total": 30000, "tips_total": 20000, "cash_audit_count": 650000}}'::jsonb,
    NOW(),
    NOW(),
    true
FROM branches b, users u
WHERE u.role = 'owner'
LIMIT 1;

-- Shift 2: Yesterday Afternoon ($440K total sales)
INSERT INTO shifts (branch_id, user_id, organization_id, start_time, end_time, turn_type, initial_cash, final_cash, expected_cash, status, closing_metadata, created_at, updated_at, synced)
SELECT 
    b.id,
    u.id,
    u.organization_id,
    NOW() - INTERVAL '13 hours',
    NOW() - INTERVAL '5 hours',
    'afternoon',
    100000,
    520000,
    520000,
    'closed',
    '{"mys": {"base_cash": 100000, "sales_cash": 280000, "sales_card": 120000, "sales_transfer": 40000, "expenses_total": 15000, "tips_total": 5000, "cash_audit_count": 520000}}'::jsonb,
    NOW(),
    NOW(),
    true
FROM branches b, users u
WHERE u.role = 'owner'
LIMIT 1;

-- Shift 3: 5 Days Ago WITH SIIGO ($640K MYS + $330K Siigo)
INSERT INTO shifts (branch_id, user_id, organization_id, start_time, end_time, turn_type, initial_cash, final_cash, expected_cash, status, closing_metadata, created_at, updated_at, synced)
SELECT 
    b.id,
    u.id,
    u.organization_id,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days' + INTERVAL '8 hours',
    'morning',
    100000,
    700000,
    700000,
    'closed',
    '{"mys": {"base_cash": 100000, "sales_cash": 400000, "sales_card": 180000, "sales_transfer": 60000, "expenses_total": 25000, "tips_total": 15000, "cash_audit_count": 700000}, "siigo": {"base_cash": 50000, "sales_cash": 200000, "sales_card": 100000, "sales_transfer": 30000, "expenses_total": 10000, "tips_total": 5000, "cash_audit_count": 235000}}'::jsonb,
    NOW(),
    NOW(),
    true
FROM branches b, users u
WHERE u.role = 'owner'
LIMIT 1;

-- Shift 4: 10 Days Ago ($395K total sales)
INSERT INTO shifts (branch_id, user_id, organization_id, start_time, end_time, turn_type, initial_cash, final_cash, expected_cash, status, closing_metadata, created_at, updated_at, synced)
SELECT 
    b.id,
    u.id,
    u.organization_id,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days' + INTERVAL '9 hours',
    'afternoon',
    100000,
    480000,
    480000,
    'closed',
    '{"mys": {"base_cash": 100000, "sales_cash": 250000, "sales_card": 110000, "sales_transfer": 35000, "expenses_total": 10000, "tips_total": 5000, "cash_audit_count": 480000}}'::jsonb,
    NOW(),
    NOW(),
    true
FROM branches b, users u
WHERE u.role = 'owner'
LIMIT 1;

-- Shift 5: 15 Days Ago WITH SHORTAGE ($475K - $5K short!)
INSERT INTO shifts (branch_id, user_id, organization_id, start_time, end_time, turn_type, initial_cash, final_cash, expected_cash, status, closing_metadata, created_at, updated_at, synced)
SELECT 
    b.id,
    u.id,
    u.organization_id,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days' + INTERVAL '8 hours',
    'morning',
    100000,
    545000,
    550000,
    'closed',
    '{"mys": {"base_cash": 100000, "sales_cash": 300000, "sales_card": 130000, "sales_transfer": 45000, "expenses_total": 20000, "tips_total": 5000, "cash_audit_count": 545000, "notes": "Faltante de $5,000"}}'::jsonb,
    NOW(),
    NOW(),
    true
FROM branches b, users u
WHERE u.role = 'owner'
LIMIT 1;

-- Verify data
SELECT 
    start_time::date as fecha,
    turn_type,
    formatcurrency(initial_cash) as base,
    (closing_metadata->'mys'->>'sales_cash')::numeric as ventas_efectivo,
    status
FROM shifts
WHERE status = 'closed'
ORDER BY start_time DESC;
