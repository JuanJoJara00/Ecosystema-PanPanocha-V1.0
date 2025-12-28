-- Migrate suppliers from existing purchase_orders
-- This creates supplier records from unique supplier names in purchase_orders

INSERT INTO suppliers (name, category, active, created_at, updated_at)
SELECT DISTINCT 
    supplier_name as name,
    'Alimentos' as category,  -- Default category, you can update manually later
    true as active,
    NOW() as created_at,
    NOW() as updated_at
FROM (
    SELECT DISTINCT 
        COALESCE(supplier->>'name', 'Proveedor Desconocido') as supplier_name
    FROM purchase_orders
    WHERE supplier IS NOT NULL
) AS unique_suppliers
WHERE supplier_name != 'Proveedor Desconocido'
AND NOT EXISTS (
    SELECT 1 FROM suppliers WHERE name = supplier_name
)
ORDER BY supplier_name;

-- Show the created suppliers
SELECT id, name, category, active FROM suppliers ORDER BY name;
