-- Ensure 'config' column exists in promotions table
ALTER TABLE public.promotions 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

-- Force update the column to be accessible
COMMENT ON COLUMN public.promotions.config IS 'Dynamic configuration for complex promotions like buy_x_get_y';

-- Grant permissions explicitly just in case
GRANT SELECT ON public.promotions TO authenticated;
GRANT SELECT ON public.promotions TO anon;

-- Refresh schema cache
NOTIFY pgrst, 'reload config';
