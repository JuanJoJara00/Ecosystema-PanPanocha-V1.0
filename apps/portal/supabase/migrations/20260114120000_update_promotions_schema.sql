-- Update promotions table to support dynamic types and config

-- Remove old check constraint
ALTER TABLE public.promotions DROP CONSTRAINT IF EXISTS promotions_type_check;

-- Add new check constraint
ALTER TABLE public.promotions 
ADD CONSTRAINT promotions_type_check 
CHECK (type IN ('percentage', 'fixed_amount', 'combo', 'buy_x_get_y', 'product_discount', 'category_discount'));

-- Add config column for dynamic fields (buy_qty, get_qty, targeted_items, etc.)
ALTER TABLE public.promotions 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

-- Notify pgrst
NOTIFY pgrst, 'reload config';
