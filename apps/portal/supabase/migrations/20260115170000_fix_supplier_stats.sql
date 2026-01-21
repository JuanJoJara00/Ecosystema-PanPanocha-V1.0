-- Drop first to ensure clean slate
DROP FUNCTION IF EXISTS get_supplier_stats();

-- Recreate with robust Security Definer + Search Path
CREATE OR REPLACE FUNCTION get_supplier_stats()
RETURNS TABLE (
    supplier_id UUID,
    total_purchased NUMERIC,
    current_debt NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Critical for Security Definer
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as supplier_id,
        COALESCE(SUM(CASE WHEN po.status = 'received' THEN po.total_amount ELSE 0 END), 0) as total_purchased,
        COALESCE(SUM(CASE 
            WHEN po.payment_status = 'pending' AND po.status IN ('pending', 'approved', 'received') 
            THEN po.total_amount 
            ELSE 0 
        END), 0) as current_debt
    FROM 
        suppliers s
    LEFT JOIN 
        purchase_orders po ON s.id = po.supplier_id
    GROUP BY 
        s.id;
END;
$$;

-- Grant access explicitly
GRANT EXECUTE ON FUNCTION get_supplier_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_supplier_stats() TO service_role;
