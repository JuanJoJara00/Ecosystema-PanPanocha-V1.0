-- SEED DATA (dev fixtures)
-- Runs automatically after 'supabase db reset'.
-- IDs are fixed UUIDs (not gen_random_uuid()) so re-running db reset gives
-- you the same org/branch/user/products every time.

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
INSERT INTO public.users (id, organization_id, full_name, email, role, pin_code_hash, created_at, updated_at)
VALUES
('user_admin', 'org_default', 'Administrador General', 'admin@panpanocha.com', 'admin', extensions.crypt('1234', extensions.gen_salt('bf')), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Branch
INSERT INTO public.branches (id, organization_id, name, city, address, phone)
VALUES
('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Sede Principal', 'Bogotá', 'Calle 123 # 45-67', '3001234567')
ON CONFLICT (id) DO NOTHING;

-- 3. Admin user (public.users profile only)
-- NOTE: public.users.id must equal the matching auth.users.id (RLS resolves
-- organization via auth.uid()). Create 'admin@panpanocha.com' in Supabase
-- Auth with this same UUID for it to be usable as a real portal login;
-- otherwise it's just usable for PIN-based POS login testing.
INSERT INTO public.users (id, organization_id, branch_id, full_name, email, role, pin_code_hash)
VALUES
('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Administrador General', 'admin@panpanocha.com', 'admin', extensions.crypt('1234', extensions.gen_salt('bf')))
ON CONFLICT (id) DO NOTHING;

-- 4. Categories
INSERT INTO public.categories (id, organization_id, name, color, icon, sort_order)
VALUES
('a0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'Panadería', '#D4AF37', 'croissant', 1),
('a0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'Bebidas', '#3B82F6', 'coffee', 2),
('a0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'Pastelería', '#EC4899', 'cake', 3)
ON CONFLICT (id) DO NOTHING;

-- 5. Products (tax_rate 0.19 = IVA general)
INSERT INTO public.products (id, organization_id, category_id, name, price, tax_rate, active)
VALUES
('a0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000010', 'Pan Francés', 500, 0.19, true),
('a0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000010', 'Pan Rollo', 600, 0.19, true),
('a0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000011', 'Tinto Campesino', 2500, 0.19, true),
('a0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000012', 'Pastel de Pollo', 4500, 0.19, true)
ON CONFLICT (id) DO NOTHING;
