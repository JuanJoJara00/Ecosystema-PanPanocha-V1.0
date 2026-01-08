-- Add is_active column to branch_ingredients for soft delete
ALTER TABLE branch_ingredients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update RLS if necessary (usually not needed for just a column addition if table already has policies)
