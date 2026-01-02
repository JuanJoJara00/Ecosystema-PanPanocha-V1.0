-- Migration: Inventory Triggers
-- Date: 2025-01-03

-- 1. Function: Update Inventory on Purchase (Stock In)
CREATE OR REPLACE FUNCTION update_inventory_on_purchase()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    target_branch_id uuid;
BEGIN
    -- Get Branch ID from the parent Purchase Order
    SELECT branch_id INTO target_branch_id 
    FROM purchase_orders 
    WHERE id = NEW.order_id;

    -- Validate that Purchase Order exists and has a branch
    IF target_branch_id IS NULL THEN
        RAISE EXCEPTION 'Purchase Order % not found or has no branch. Cannot update inventory.', NEW.order_id;
    END IF;

    -- Upsert into Branch Inventory
    INSERT INTO branch_inventory (branch_id, item_id, quantity, last_updated)
    VALUES (target_branch_id, NEW.item_id, NEW.quantity, NOW())
    ON CONFLICT (branch_id, item_id)
    DO UPDATE SET 
        quantity = branch_inventory.quantity + EXCLUDED.quantity,
        last_updated = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger: Attach to purchase_order_items
DROP TRIGGER IF EXISTS trg_update_inventory_purchase ON purchase_order_items;
CREATE TRIGGER trg_update_inventory_purchase
AFTER INSERT ON purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_purchase();



