-- Migration: Add Channel Tracking to Sales
-- Description: Adds 'channel_id' to 'sales' to track performance by channel (e.g. Retail, Rappi).

-- 1. Add channel_id column to link sales to specific channels
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS channel_id uuid REFERENCES public.sales_channels(id);

-- 2. Add index for performance when querying analytics by channel
CREATE INDEX IF NOT EXISTS idx_sales_channel_id ON public.sales(channel_id);

-- 3. Comment for clarity
COMMENT ON COLUMN public.sales.channel_id IS 'Reference to the sales channel (e.g. Retail, Delivery) where this sale occurred';
