-- Disable RLS on relevant tables to ease development/debugging
-- This removes all row-level permission checks for these tables

ALTER TABLE "suppliers" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_orders" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "purchase_order_items" DISABLE ROW LEVEL SECURITY;

-- Optional: Grant all privileges to authenticated/service_role just in case RLS wasn't the only issue
GRANT ALL ON "suppliers" TO authenticated, service_role;
GRANT ALL ON "purchase_orders" TO authenticated, service_role;
GRANT ALL ON "purchase_order_items" TO authenticated, service_role;
