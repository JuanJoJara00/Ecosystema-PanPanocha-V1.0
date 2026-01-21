-- Add ignore_promotions column to product_prices
-- This allows a price override to take precedence over active promotions

ALTER TABLE public.product_prices 
ADD COLUMN IF NOT EXISTS ignore_promotions BOOLEAN DEFAULT FALSE;

-- Notify pgrst to refresh schema cache
NOTIFY pgrst, 'reload config';
