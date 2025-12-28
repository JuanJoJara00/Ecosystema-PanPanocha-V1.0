-- Function to get supplier stats (total purchased and current debt) efficiently
-- This avoids the N+1 query problem in the frontend

CREATE OR REPLACE FUNCTION get_supplier_stats()
RETURNS TABLE (
    supplier_id UUID,
    total_purchased NUMERIC,
    current_debt NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as supplier_id,
        -- Total purchased: sum of all received orders
        COALESCE(SUM(CASE WHEN po.status = 'received' THEN po.total_amount ELSE 0 END), 0) as total_purchased,
        -- Current debt: sum of orders that are pending payment (but valid status)
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

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_supplier_stats() TO authenticated;
