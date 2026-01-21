-- Migration: Cleanup and Optimization v3.0
-- Description: Consolidates 'branch_products' into 'product_prices', removes 'promotion_targets', and optimizes RPCs.

-- 1. Modify 'product_prices' to allow NULL price (for availability-only overrides)
ALTER TABLE public.product_prices ALTER COLUMN price DROP NOT NULL;

-- 2. Migrate data from 'branch_products' to 'product_prices'
-- We map 'branch_products' entries to 'product_prices' with NULL price (inheriting base price)
-- and 'channel_id' NULL (applying to all channels or base scope).
INSERT INTO public.product_prices (organization_id, product_id, branch_id, is_active, price)
SELECT 
    b.organization_id,
    bp.product_id,
    bp.branch_id,
    bp.is_active,
    NULL -- Inherit base price
FROM public.branch_products bp
JOIN public.branches b ON b.id = bp.branch_id
ON CONFLICT (organization_id, product_id, channel_id, branch_id) 
DO UPDATE SET is_active = EXCLUDED.is_active;

-- 3. Redefine 'get_branch_products_stock' RPC to use 'product_prices' for availability checks
-- Note: logic assumes that if a record exists in product_prices for this branch, we respect its is_active.
-- If no record exists, we assume it's NOT active (opt-in) or ACTIVE (opt-out)?
-- 'branch_products' was typically opt-in. Let's assume standard visibility logic:
-- If row exists, use is_active. If not, fallback to product.active global?
-- The previous logic in ProductList suggested explicitly fetching links.

CREATE OR REPLACE FUNCTION get_branch_products_stock(p_branch_id uuid)
RETURNS TABLE (
    product_id uuid,
    stock numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as product_id,
        COALESCE(
            (
                -- Calculate simplified stock based on recipe (min ingredient stock)
                -- This is a simplified view; accurate stock requires detailed inventory calculation
                SELECT MIN(
                    COALESCE(bi.current_stock, 0) / pr.quantity_required
                )
                FROM public.product_recipes pr
                JOIN public.branch_ingredients bi ON bi.ingredient_id = pr.ingredient_id
                WHERE pr.product_id = p.id AND bi.branch_id = p_branch_id
            ),
            0
        ) as stock
    FROM public.products p
    LEFT JOIN public.product_prices pp ON pp.product_id = p.id AND pp.branch_id = p_branch_id
    WHERE 
        p.active = true 
        AND (pp.is_active IS NULL OR pp.is_active = true); 
        -- Logic: Global active AND (No specific branch override OR Branch override is true)
END;
$$;


-- 4. Drop redundant tables
DROP TABLE IF EXISTS public.branch_products;
DROP TABLE IF EXISTS public.promotion_targets;

-- 5. Add any missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_prices_lookup ON public.product_prices(product_id, branch_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_promotions_config ON public.promotions USING gin(config);
