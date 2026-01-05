-- ==========================================
-- RESTORE MISSING TABLES MIGRATION
-- ==========================================
-- This script adds the missing tables required by the Portal frontend:
-- 1. Supply Chain: suppliers, purchase_orders, purchase_order_items
-- 2. Payroll: employees, payroll, payroll_items, employee_custom_permissions, role_permissions
-- 3. Deliveries: deliveries, rappi_deliveries
-- 4. Storage: payment_proofs bucket
-- ==========================================

-- 0. ENUMS
-- IMPORTANT: Please create these types MANUALLY in Supabase Dashboard > Database > Enumerated Types
-- NOTE: Please use LOWERCASE for all values to ensure consistency.

-- Type Name: user_role
-- Values: dev, owner, admin, cajero, panadero, cocina, mesero, empleado, domicilios/pick-up

-- Type Name: delivery_status
-- Values: pending, dispatched, delivered, cancelled

/*
CREATE TYPE public.user_role AS ENUM ('dev', 'owner', 'admin', 'cajero', 'panadero', 'cocina', 'mesero', 'empleado', 'domicilios/pick-up');
CREATE TYPE public.delivery_status AS ENUM ('pending', 'dispatched', 'delivered', 'cancelled');
*/

-- 1. SUPPLIERS
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    delivery_day TEXT, -- 'monday', 'tuesday', etc.
    delivery_time_days INTEGER DEFAULT 1,
    notes_delivery TEXT,
    order_day TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add supplier_id to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- 2. PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.users(id),
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'received', 'cancelled'
    payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid'
    total_amount NUMERIC(15, 2) DEFAULT 0,
    invoice_url TEXT,
    payment_proof_url TEXT,
    last_modified_by UUID REFERENCES public.users(id),
    last_modified_at TIMESTAMPTZ,
    last_edit_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
    quantity NUMERIC(15, 3) NOT NULL,
    unit_price NUMERIC(15, 2),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. EMPLOYEES & PAYROLL
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    position TEXT NOT NULL, -- 'cajero', 'panadero', etc.
    salary_type TEXT DEFAULT 'monthly', -- 'monthly', 'biweekly', 'daily', 'hourly'
    base_salary NUMERIC(15, 2) NOT NULL DEFAULT 0,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    payment_date DATE,
    base_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    bonuses NUMERIC(15, 2) DEFAULT 0,
    deductions NUMERIC(15, 2) DEFAULT 0,
    net_amount NUMERIC(15, 2) DEFAULT 0,
    payment_method TEXT DEFAULT 'transfer',
    payment_type TEXT DEFAULT 'on_time', -- 'on_time', 'advance', 'late'
    status TEXT DEFAULT 'pending', -- 'pending', 'paid'
    payment_proof_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payroll_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_id UUID NOT NULL REFERENCES public.payroll(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL, -- 'bonus', 'deduction'
    concept TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PERMISSIONS
CREATE TABLE IF NOT EXISTS public.employee_custom_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE UNIQUE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- Link to auth user if they have login
    -- Module Access
    access_dashboard BOOLEAN DEFAULT false,
    access_pos BOOLEAN DEFAULT false,
    access_orders BOOLEAN DEFAULT false,
    access_inventory BOOLEAN DEFAULT false,
    access_products BOOLEAN DEFAULT false,
    access_employees BOOLEAN DEFAULT false,
    access_payroll BOOLEAN DEFAULT false,
    access_reports BOOLEAN DEFAULT false,
    access_branches BOOLEAN DEFAULT false,
    access_deliveries BOOLEAN DEFAULT false,
    access_cash_closing BOOLEAN DEFAULT false,
    -- Specific Permissions
    pos_checkout BOOLEAN DEFAULT false,
    pos_register_only BOOLEAN DEFAULT false,
    pos_full_access BOOLEAN DEFAULT false,
    manage_branch_users BOOLEAN DEFAULT false,
    manage_all_users BOOLEAN DEFAULT false,
    view_own_branch_only BOOLEAN DEFAULT true,
    view_own_data_only BOOLEAN DEFAULT false,
    view_all_branches BOOLEAN DEFAULT false,
    view_all_payroll BOOLEAN DEFAULT false,
    
    modified_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role public.user_role NOT NULL, 
    permission TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(role, permission)
);

-- 5. DELIVERIES (INTERNAL)
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    assigned_driver TEXT, -- Name of driver if internal
    customer_name TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    delivery_fee NUMERIC(15, 2) DEFAULT 0,
    status public.delivery_status DEFAULT 'pending',
    notes TEXT,
    product_details TEXT, -- JSON string or description
    
    delivery_receipt_url TEXT,
    client_payment_proof_url TEXT,
    delivery_document_id TEXT, -- For invoices
    delivery_name TEXT, -- Short description

    last_edited_by UUID,
    last_edited_at TIMESTAMPTZ,
    last_edit_type TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. RAPPI DELIVERIES
CREATE TABLE IF NOT EXISTS public.rappi_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    rappi_order_id TEXT,
    
    status TEXT DEFAULT 'created', -- 'created', 'preparing', 'ready', 'picked_up'
    
    customer_name TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    
    product_details TEXT, -- JSON string
    total_value NUMERIC(15, 2) DEFAULT 0,
    delivery_fee NUMERIC(15, 2) DEFAULT 0,
    
    assigned_driver TEXT, -- Rappi driver name
    
    ticket_url TEXT,
    rappi_receipt_url TEXT,
    order_ready_url TEXT, -- Photo of order ready
    
    notes TEXT,
    
    last_edited_by UUID,
    last_edited_at TIMESTAMPTZ,
    last_edit_type TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);


-- 7. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('payment_proofs', 'payment_proofs', true),
    ('deliveries', 'deliveries', true)
ON CONFLICT (id) DO NOTHING;

-- RLS POLICIES
-- Strategy:
-- 1. Dev Access: Global Check (role = 'dev').
-- 2. Owner Access: Global for Org (role = 'owner').
-- 3. Admin Access: Branch restricted (role = 'admin').
-- 4. Staff Access: Specific permissions (cajero, panadero, etc.).

-- 1. SUPPLIERS (Org-wide)
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers: View for Org" ON public.suppliers 
FOR SELECT TO authenticated USING (
    -- Dev Global
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'dev')
    OR
    -- Org Match
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "Suppliers: Manage for Admins" ON public.suppliers 
FOR ALL TO authenticated USING (
    -- Dev Global
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'dev')
    OR
    -- Org Admin/Owner
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND organization_id = suppliers.organization_id
        AND (role IN ('owner', 'admin', 'cajero')) -- Owners, Admins, Cajeros can manage suppliers
    )
);

-- 2. PURCHASE ORDERS (Branch-specific)
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PO: Access Policy" ON public.purchase_orders 
FOR ALL TO authenticated USING (
    -- Dev Global
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'dev')
    OR
    -- Standard Access
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.organization_id = purchase_orders.organization_id
        AND (
            (u.role = 'owner') -- Owner sees all
            OR (u.role = 'admin' AND u.branch_id IS NULL) -- Legacy Owner
            OR (u.branch_id = purchase_orders.branch_id) -- Branch Match for others
        )
    )
);

-- 3. PURCHASE ORDER ITEMS (Inherit from Order)
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PO Items: Access Policy" ON public.purchase_order_items 
FOR ALL TO authenticated USING (
    -- Dev Global
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'dev')
    OR
    -- Standard Access
    EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE po.id = purchase_order_items.order_id
        AND EXISTS (
             SELECT 1 FROM public.users u
             WHERE u.id = auth.uid()
             AND u.organization_id = po.organization_id
             AND (
                (u.role = 'owner')
                OR (u.role = 'admin' AND u.branch_id IS NULL)
                OR (u.branch_id = po.branch_id)
             )
        )
    )
);

-- 4. EMPLOYEES (Org/Branch managed)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees: View/Manage" ON public.employees 
FOR ALL TO authenticated USING (
    -- Dev Global
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'dev')
    OR
    -- Standard Access
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.organization_id = employees.organization_id
        AND (
            (u.role = 'owner') -- Owner sees all
            OR (u.role = 'admin' AND u.branch_id IS NULL)
            OR (u.branch_id = employees.branch_id) -- Branch Admin sees own staff
            OR (u.employee_id = employees.id) -- Self View
        )
    )
);

-- 5. PAYROLL (Sensitive - Self & Admin)
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payroll: View Own" ON public.payroll 
FOR SELECT TO authenticated USING (
    -- Self View (Most common)
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.employee_id = payroll.employee_id
    )
    OR 
    -- Dev Global
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'dev')
);

CREATE POLICY "Payroll: Manage Admin" ON public.payroll 
FOR ALL TO authenticated USING (
    -- Dev Global
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'dev')
    OR
    -- Admin Management
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.organization_id = payroll.organization_id
        AND (
            (u.role = 'owner') -- Owner has full access
            OR (u.role = 'admin' AND u.branch_id IS NULL)
            OR (
                u.role IN ('admin') 
                AND u.branch_id IS NOT NULL
                AND EXISTS ( -- Check if employee belongs to admin's branch
                    SELECT 1 FROM public.employees e
                    WHERE e.id = payroll.employee_id
                    AND e.branch_id = u.branch_id
                )
            )
        )
    )
);

-- 6. PAYROLL ITEMS (Inherit)
ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payroll Items: Access" ON public.payroll_items 
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.payroll p
        WHERE p.id = payroll_items.payroll_id
        AND (
             -- Dev Global
             EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'dev')
             OR
             -- Own View
             EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.employee_id = p.employee_id)
             OR 
             -- Admin Manage
             EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                AND u.organization_id = p.organization_id
                AND (
                    (u.role = 'owner')
                    OR (u.role = 'admin' AND u.branch_id IS NULL)
                    OR (
                        u.role = 'admin' 
                        AND u.branch_id IS NOT NULL
                        AND EXISTS (SELECT 1 FROM public.employees e WHERE e.id = p.employee_id AND e.branch_id = u.branch_id)
                    )
                )
             )
        )
    )
);

-- 7. DELIVERIES (Branch Based)
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deliveries: Access" ON public.deliveries 
FOR ALL TO authenticated USING (
    -- Dev Global
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'dev')
    OR
    -- Standard Access
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.organization_id = deliveries.organization_id
        AND (
            (u.role = 'owner')
            OR (u.role = 'domicilios/pick-up') -- Domicilios Manager (Org Wide)
            OR (u.role = 'admin' AND u.branch_id IS NULL)
            OR (u.branch_id = deliveries.branch_id)
            -- Branch Staff (Cajero/Empleado) for delivery operations
            -- Note: Mesero/Cocina/Panadero typically don't manage deliveries, but can be added if needed.
            OR (u.role IN ('cajero', 'empleado') AND u.branch_id = deliveries.branch_id)
        )
    )
);

-- 8. RAPPI DELIVERIES (Branch Based)
ALTER TABLE public.rappi_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rappi: Access" ON public.rappi_deliveries 
FOR ALL TO authenticated USING (
    -- Dev Global
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'dev')
    OR
    -- Standard Access
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.organization_id = rappi_deliveries.organization_id
        AND (
            (u.role = 'owner')
            OR (u.role = 'domicilios/pick-up') -- Domicilios Manager (Org Wide)
            OR (u.role = 'admin' AND u.branch_id IS NULL)
            OR (u.branch_id = rappi_deliveries.branch_id)
            OR (u.role = 'admin' AND u.branch_id IS NULL)
            OR (u.branch_id = rappi_deliveries.branch_id)
            OR (u.role IN ('cajero', 'empleado') AND u.branch_id = rappi_deliveries.branch_id)
        )
    )
);

-- Storage Policy
CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id IN ('payment_proofs', 'deliveries'));
CREATE POLICY "Allow public read" ON storage.objects FOR SELECT TO public USING (bucket_id IN ('payment_proofs', 'deliveries'));
