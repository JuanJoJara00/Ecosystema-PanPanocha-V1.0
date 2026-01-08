-- Create enum type for inventory items
CREATE TYPE public.inventory_item_type AS ENUM ('raw_material', 'supply');

-- Add type column to inventory_items table
ALTER TABLE public.inventory_items 
ADD COLUMN item_type public.inventory_item_type DEFAULT 'raw_material'::public.inventory_item_type;

-- Update valid types check if needed (Postgres ENUM handles validation)
COMMENT ON COLUMN public.inventory_items.item_type IS 'Distinguishes between raw materials (ingredients) and supplies (operational items like detergent, packaging)';
