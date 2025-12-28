-- Fix FK to point to profiles to allow joining
ALTER TABLE purchase_orders
DROP CONSTRAINT IF EXISTS purchase_orders_last_modified_by_fkey;

ALTER TABLE purchase_orders
ADD CONSTRAINT purchase_orders_last_modified_by_fkey
FOREIGN KEY (last_modified_by)
REFERENCES profiles(id);
