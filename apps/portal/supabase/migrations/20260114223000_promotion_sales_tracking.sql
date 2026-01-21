-- Migration: Add Promotion Tracking to Sale Items
-- Description: Adds 'promotion_id' and 'discount_amount' to 'sale_items' to track promotion performance (GMV, Investment).

-- 1. Add promotion_id column to link sale items to valid promotions
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS promotion_id uuid REFERENCES public.promotions(id);

-- 2. Add discount_amount to track the specific monetary value of the discount applied
-- This allows calculating "Investment" (Total Discount Given) without complex reverse calculations
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;

-- 3. Add index for performance when querying analytics by promotion
CREATE INDEX IF NOT EXISTS idx_sale_items_promotion_id ON public.sale_items(promotion_id);

-- 4. Comment for clarity
COMMENT ON COLUMN public.sale_items.promotion_id IS 'Reference to the promotion applied to this line item';
COMMENT ON COLUMN public.sale_items.discount_amount IS 'The total discount value applied to this line item (unit_discount * quantity)';
