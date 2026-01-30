-- Clean EVERYTHING except Users and Organizations
-- Run this in your Supabase SQL Editor

-- 0. Unlink Users from dependencies so we can delete them
-- We keep the Users, but they will be 'orphaned' (no branch/employee assigned)
UPDATE public.users SET branch_id = NULL, employee_id = NULL;

-- 1. Transactions & Operations
TRUNCATE TABLE sale_items CASCADE;
TRUNCATE TABLE sales CASCADE;
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE purchase_order_items CASCADE;
TRUNCATE TABLE purchase_orders CASCADE;
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE tip_distributions CASCADE;
TRUNCATE TABLE shifts CASCADE;
TRUNCATE TABLE rappi_deliveries CASCADE;
TRUNCATE TABLE deliveries CASCADE;
TRUNCATE TABLE payroll_items CASCADE;
TRUNCATE TABLE payroll CASCADE;
TRUNCATE TABLE stock_reservations CASCADE;
TRUNCATE TABLE provisioning_sessions CASCADE;

-- 2. Catalog & Inventory
TRUNCATE TABLE product_prices CASCADE;
TRUNCATE TABLE product_recipes CASCADE;
TRUNCATE TABLE product_combos CASCADE;
TRUNCATE TABLE branch_ingredients CASCADE;
TRUNCATE TABLE inventory_items CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE promotions CASCADE;
TRUNCATE TABLE suppliers CASCADE;
TRUNCATE TABLE clients CASCADE;

-- 3. Configuration & Metadata
TRUNCATE TABLE branch_channels CASCADE;
TRUNCATE TABLE sales_channels CASCADE;
TRUNCATE TABLE tables CASCADE;
TRUNCATE TABLE devices CASCADE;
TRUNCATE TABLE employee_custom_permissions CASCADE;
TRUNCATE TABLE role_permissions CASCADE;

-- 4. Core Structure (Now safe to delete because Users were unlinked)
TRUNCATE TABLE employees CASCADE;
TRUNCATE TABLE branches CASCADE;

-- Tables KEPT:
-- users (Requested to keep)
-- organizations (Requested to keep)
