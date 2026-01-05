-- SEED DATA (PowerSync Compatible)
-- This file runs automatically after 'supabase db reset'

-- 1. Organizations (The Tenant)
INSERT INTO public.organizations (id, name, nit, address, phone, email, created_at, updated_at)
VALUES 
('org_default', 'Pan Panocha', '900.123.456-7', 'Calle 123 # 45-67', '3001234567', 'admin@panpanocha.com', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Branches
INSERT INTO public.branches (id, organization_id, name, city, address, phone, created_at, updated_at)
VALUES
('branch_main', 'org_default', 'Sede Principal', 'Bogotá', 'Calle 123 # 45-67', '3001234567', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Users (App Users - matching Supabase Auth is trickier in seed, we just insert the public profile)
-- NOTE: You must sign up this user in Supabase Auth carefully, or we assume a dev/test user 'user_admin'
INSERT INTO public.users (id, organization_id, full_name, email, role, pin_code, created_at, updated_at)
VALUES
('user_admin', 'org_default', 'Administrador General', 'admin@panpanocha.com', 'admin', '1234', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Taxes (Default IVA/Impoconsumo)
INSERT INTO public.taxes (id, organization_id, name, percentage, type, is_active)
VALUES
('tax_iva_19', 'org_default', 'IVA 19%', 19.00, 'percentage', true),
('tax_impo_8', 'org_default', 'Impoconsumo 8%', 8.00, 'percentage', true),
('tax_zero', 'org_default', 'Exento 0%', 0.00, 'percentage', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Payment Methods
INSERT INTO public.payment_methods (id, organization_id, name, type, is_active)
VALUES
('pm_cash', 'org_default', 'Efectivo', 'cash', true),
('pm_card', 'org_default', 'Tarjeta Débito/Crédito', 'card', true),
('pm_transfer', 'org_default', 'Transferencia (Nequi/Daviplata)', 'transfer', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Categories (Basic Setup)
INSERT INTO public.categories (id, organization_id, name, color, icon, sort_order)
VALUES
('cat_bread', 'org_default', 'Panadería', '#D4AF37', 'croissant', 1),
('cat_drinks', 'org_default', 'Bebidas', '#3B82F6', 'coffee', 2),
('cat_pastry', 'org_default', 'Pastelería', '#EC4899', 'cake', 3)
ON CONFLICT (id) DO NOTHING;

-- 7. Products (Sample)
INSERT INTO public.products (id, organization_id, category_id, name, price, stock, is_active)
VALUES
('prod_1', 'org_default', 'cat_bread', 'Pan Francés', 500, 100, true),
('prod_2', 'org_default', 'cat_bread', 'Pan Rollo', 600, 100, true),
('prod_3', 'org_default', 'cat_drinks', 'Tinto Campesino', 2500, 50, true),
('prod_4', 'org_default', 'cat_pastry', 'Pastel de Pollo', 4500, 30, true)
ON CONFLICT (id) DO NOTHING;

-- 8. Branch Inventory (Link Products to Branch)
-- NOTE: branch_inventory table might be deprecated or renamed. Commenting out for now.
-- INSERT INTO public.branch_inventory (id, branch_id, product_id, stock, min_stock)
-- VALUES
-- ('inv_1', 'branch_main', 'prod_1', 100, 20),
-- ('inv_2', 'branch_main', 'prod_2', 100, 20),
-- ('inv_3', 'branch_main', 'prod_3', 50, 10),
-- ('inv_4', 'branch_main', 'prod_4', 30, 5)
-- ON CONFLICT (id) DO NOTHING;
