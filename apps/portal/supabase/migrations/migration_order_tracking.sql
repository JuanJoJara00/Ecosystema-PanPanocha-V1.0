-- Add modification tracking columns to purchase_orders

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES auth.users(id);

-- Optional: Add a comment or description of change if desired, but user asked for date/time mainly.
