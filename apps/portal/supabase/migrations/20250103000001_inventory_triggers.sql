-- Migration: Inventory Triggers
-- Date: 2025-01-03

-- 1. Function: Update Inventory on Purchase (Stock In)
CREATE OR REPLACE FUNCTION update_inventory_on_purchase()
RETURNS TRIGGER AS $$
DECLARE
    target_branch_id uuid;
BEGIN
    -- Get Branch ID from the parent Purchase Order
    SELECT branch_id INTO target_branch_id 
    FROM purchase_orders 
    WHERE id = NEW.order_id;

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


-- 3. Function: Deduct Inventory on Sale (Stock Out)
CREATE OR REPLACE FUNCTION deduct_inventory_on_sale()
RETURNS TRIGGER AS $$
DECLARE
    target_branch_id uuid;
    product_recipe jsonb; -- Future proofing: if products have sub-ingredients (inventory items)
BEGIN
    -- Get Branch ID from the parent Sale
    SELECT branch_id INTO target_branch_id 
    FROM sales 
    WHERE id = NEW.sale_id;

    -- Simple Deduction (Direct Product -> Inventory Item mapping assumed for now?)
    -- Or is 'product' different from 'inventory_item'?
    -- In PanPanocha, 'products' are sold, 'inventory_items' are ingredients.
    -- If they map 1:1 (e.g. selling a bottle of water), we need a mapping or check.
    -- If mapped via 'products.id' = 'inventory_items.id'? Unlikely.
    -- Schema implies:
    -- 'products' (menu items)
    -- 'inventory_items' (raw materials)
    -- If NO recipe exists, we cannot deduct inventory from a sale automatically unless the product IS the inventory item.
    -- Assuming for this scope: We deduct if there's a direct match or we skip.
    -- Actually, if we are selling "Pan", we deduct "Harina"? Too complex for a simple trigger without a recipe table.
    -- User request says: "Automate stock movements".
    -- "products" table has "stock" column in schema.ts (line 44).
    -- So we should updates PRODUCTS.STOCK, not inventory_items?
    -- Schema.ts: products has `stock`.
    -- Schema.ts: branch_inventory links `inventory_items`.
    -- IF the requirement is to update `products.stock` (Retail), then:
    
    UPDATE products 
    SET stock = stock - NEW.quantity 
    WHERE id = NEW.product_id;
    
    -- Note: This updates the global product stock if 'products' is global.
    -- But stock should be per branch?
    -- Schema.ts `products` table has `stock` (integer), but NO `branch_id`.
    -- This implies stock is tracked GLOBALLY? That's bad for multi-branch.
    -- Recommendation: Move stock to `branch_products` or similar.
    -- However, `branch_inventory` links to `inventory_items` (ingredients).
    -- If we are selling Retail items, we should probably check `branch_inventory` if `products` map there.
    -- Given the ambiguity, I will implement deduction on `products.stock` (Global) as a placeholder, 
    -- BUT primarily I will assume `products` might have a recipe.
    -- WITHOUT RECIPES, I will just log or update `products.stock`.
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger: Attach to sale_items
DROP TRIGGER IF EXISTS trg_deduct_inventory_sale ON sale_items;
CREATE TRIGGER trg_deduct_inventory_sale
AFTER INSERT ON sale_items
FOR EACH ROW
EXECUTE FUNCTION deduct_inventory_on_sale();
