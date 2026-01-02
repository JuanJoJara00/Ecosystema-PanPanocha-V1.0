-- ARCHIVO: supabase/migrations/20250102000000_inventory_deduction.sql

-- 0. Ensure sale_items exists (Resilience)
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER DEFAULT 1,
    unit_price Decimal(12,2) DEFAULT 0,
    total_price Decimal(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 0a. Enable RLS on sale_items (Audit Fix)
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- 1. Helper Function for Branch Access (Moved here for dependency resolution)
-- ADDING branch_id to profiles to make this work (Self-Healing Architecture)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

CREATE OR REPLACE FUNCTION public.check_branch_access(requested_branch_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_branch_id UUID;
  user_role TEXT;
BEGIN
  SELECT branch_id, role INTO user_branch_id, user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Admin / Operations can access all
  IF user_role IN ('admin', 'operaciones') THEN
    RETURN TRUE;
  END IF;

  -- Cajero/Cocina restricted to their assigned branch
  RETURN user_branch_id = requested_branch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE POLICY "Users can view sale items of their branch" ON sale_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM sales
    WHERE sales.id = sale_items.sale_id
    AND public.check_branch_access(sales.branch_id)
  )
);

-- 1. Ensure products has stock column (per Audit recommendation)
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;

-- 2. Create Function for Deduction
CREATE OR REPLACE FUNCTION deduct_inventory_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id AND stock >= NEW.quantity;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient stock for product %', NEW.product_id;
    END IF;
    RETURN NEW;

  ELSIF (TG_OP = 'DELETE') THEN
    -- Restore stock on deletion (Refund/Cancellation)
    UPDATE products
    SET stock = stock + OLD.quantity
    WHERE id = OLD.product_id;
    RETURN OLD;

  ELSIF (TG_OP = 'UPDATE') THEN
    -- Handle quantity changes
    -- 1. Restore OLD quantity
    UPDATE products
    SET stock = stock + OLD.quantity
    WHERE id = OLD.product_id;

    -- 2. Deduct NEW quantity
    UPDATE products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id AND stock >= NEW.quantity;

    IF NOT FOUND THEN
       RAISE EXCEPTION 'Insufficient stock for product % update', NEW.product_id;
    END IF;
    
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- 3. Create Trigger
DROP TRIGGER IF EXISTS trigger_deduct_stock ON sale_items;

CREATE TRIGGER trigger_deduct_stock
AFTER INSERT OR UPDATE OR DELETE ON sale_items
FOR EACH ROW
EXECUTE FUNCTION deduct_inventory_on_sale();
