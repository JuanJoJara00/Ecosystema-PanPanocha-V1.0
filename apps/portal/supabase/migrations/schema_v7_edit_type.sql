ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS last_edit_type text CHECK (last_edit_type IN ('manual', 'reception'));
