-- Update promotions check constraint to include 'global_discount'

-- Remove old check constraint
ALTER TABLE public.promotions DROP CONSTRAINT IF EXISTS promotions_type_check;

-- Add new check constraint with 'global_discount' included
ALTER TABLE public.promotions 
ADD CONSTRAINT promotions_type_check 
CHECK (type IN ('percentage', 'fixed_amount', 'combo', 'buy_x_get_y', 'product_discount', 'category_discount', 'global_discount'));

-- Notify pgrst to reload schema
NOTIFY pgrst, 'reload config';
