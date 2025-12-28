-- Add unit_cost to inventory_items
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS unit_cost numeric DEFAULT 0;

-- Update the view if it exists (schema_v2 created a view? No, just tables, but let's check policies)
-- Policies usually apply to the table, so adding a column is fine.
