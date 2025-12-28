-- Add SKU and Supplier ID to inventory_items
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS sku text UNIQUE,
ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id);

-- Make Name unique to prevent duplicates if SKU is missing
ALTER TABLE inventory_items 
ADD CONSTRAINT inventory_items_name_key UNIQUE (name);
