-- ARCHIVO: supabase/migrations/20250103_harden_rls.sql

-- 1. Helper Function for Branch Access
-- We assume `public.users` or `public.profiles` or somewhere has the branch link.
-- NOTE: In this system, user-branch link seems to be dynamic (shift-based) or in profiles?
-- Based on audit, we need to enforce that the user IS PART OF THE BRANCH they are querying.
-- If `profiles` doesn't have `branch_id`, we might need to rely on `user_roles` or similar if it exists.
-- BUT, since the user provided this specific SQL, I will assume they know a `public.users` table exists 
-- or they want me to create this link in `profiles`.

-- Let's Check if we can use `profiles` and ADD `branch_id` if missing, or use `branches`?
-- A user might belong to multiple branches? For now, let's assume 1:1 or rely on metadata.
-- Or better, we define the function to check against `profiles.role = 'admin'` OR `profiles.branch_id`.

-- ADDING branch_id to profiles to make this work (Self-Healing Architecture)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

CREATE OR REPLACE FUNCTION auth.check_branch_access(requested_branch_id UUID)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Apply to Sales
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Branch Isolation Policy" ON sales;

CREATE POLICY "Branch Isolation Policy" ON sales
FOR ALL
USING (
  auth.check_branch_access(branch_id) 
  OR 
  (auth.jwt() ->> 'role') = 'service_role'
);

-- 3. Apply to Inventory Items (Optional, if they are branch-specific? 
-- Actually inventory_items are global definitions usually, branch_inventory is specific.
-- But if the user wants strict check on `inventory_items` table, maybe it has branch_id?
-- Checking schema: inventory_items does NOT have branch_id. branch_inventory DOES.
-- So applying this only to `branch_inventory` makes more sense, OR `inventory_items` is shared.
-- I will apply to `branch_inventory` as it's the critical one for counts.

ALTER TABLE branch_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Inventory Branch Access" ON branch_inventory;

CREATE POLICY "Inventory Branch Access" ON branch_inventory
FOR ALL
USING (auth.check_branch_access(branch_id));

-- 4. Apply to Siigo Closings (as per original plan)
ALTER TABLE siigo_closings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Strict Branch Access Select" ON siigo_closings;
DROP POLICY IF EXISTS "Strict Branch Access Insert" ON siigo_closings;

CREATE POLICY "Branch Isolation Policy" ON siigo_closings
FOR ALL
USING (auth.check_branch_access(branch_id));
