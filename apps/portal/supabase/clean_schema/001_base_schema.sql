-- =====================================================================
-- Pan Panocha - Clean base schema (public)
-- Extracted from production pg_dumpall backup (ca7c42cc-Backup_SQL_PP.2.backup)
-- Contains ONLY application DDL: types, tables, constraints, indexes,
-- functions and triggers living in the `public` schema.
-- Supabase system schemas (auth, storage, realtime, vault, graphql,
-- graphql_public, pgbouncer, extensions, cron, net, pgsodium) are
-- intentionally excluded - they are provisioned automatically by any
-- new Supabase project.
-- No data (COPY/INSERT) is included - structure only.
-- =====================================================================

-- =====================================================================
-- ENUM TYPES
-- =====================================================================

CREATE TYPE public.delivery_status AS ENUM (
    'pending',
    'dispatched',
    'delivered',
    'cancelled'
);
COMMENT ON TYPE public.delivery_status IS 'Status tracking for internal and external deliveries.';

CREATE TYPE public.edit_type AS ENUM (
    'created',
    'updated',
    'deleted',
    'status_change'
);

CREATE TYPE public.employee_position AS ENUM (
    'cajero',
    'panadero',
    'cocina',
    'mesero',
    'domiciliario',
    'limpieza',
    'administrador',
    'otro'
);

CREATE TYPE public.expense_category AS ENUM (
    'servicios',
    'nomina',
    'inventario',
    'mantenimiento',
    'arriendo',
    'transporte',
    'marketing',
    'impuestos',
    'domicilios',
    'otro'
);

CREATE TYPE public.inventory_item_type AS ENUM (
    'raw_material',
    'supply'
);

CREATE TYPE public.inventory_unit AS ENUM (
    'kg',
    'g',
    'l',
    'ml',
    'unidad',
    'paquete',
    'caja',
    'docena',
    'lb'
);

CREATE TYPE public.payment_method AS ENUM (
    'cash_panpanocha',
    'cash_siigo',
    'card',
    'transfer',
    'rappi'
);

CREATE TYPE public.payroll_status AS ENUM (
    'pending',
    'paid'
);
COMMENT ON TYPE public.payroll_status IS 'Payment status for employee payroll records.';

CREATE TYPE public.purchase_order_status AS ENUM (
    'pending',
    'approved',
    'received',
    'cancelled'
);
COMMENT ON TYPE public.purchase_order_status IS 'Status tracking for purchase orders from creation to completion.';

CREATE TYPE public.rappi_order_status AS ENUM (
    'created',
    'preparing',
    'ready',
    'picked_up'
);
COMMENT ON TYPE public.rappi_order_status IS 'Status tracking for Rappi delivery orders.';

CREATE TYPE public.salary_type AS ENUM (
    'monthly',
    'biweekly',
    'weekly',
    'daily',
    'hourly'
);

CREATE TYPE public.sale_status AS ENUM (
    'pending',
    'completed',
    'cancelled',
    'refunded'
);

CREATE TYPE public.shift_status AS ENUM (
    'open',
    'closed',
    'pending_review'
);

CREATE TYPE public.shift_type AS ENUM (
    'mañana',
    'tarde',
    'turno_unico'
);

CREATE TYPE public.user_role AS ENUM (
    'dev',
    'owner',
    'admin',
    'domicilios/pick-up',
    'panadero',
    'cajero',
    'cocina',
    'mesero',
    'empleado'
);
COMMENT ON TYPE public.user_role IS NULL;

-- =====================================================================
-- TABLES (ordered to satisfy foreign key dependencies)
-- =====================================================================

-- Tabla: organizations (root tenant entity)
CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    nit text,
    address text,
    phone text,
    email text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: branches
CREATE TABLE public.branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    city text,
    address text,
    phone text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: users (app-level users, separate from auth.users; PIN-based POS login)
CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    email text,
    full_name text,
    pin_code text,
    created_at timestamp with time zone DEFAULT now(),
    active boolean DEFAULT true,
    branch_id uuid,
    employee_id uuid,
    role public.user_role DEFAULT 'empleado'::public.user_role
);

-- Tabla: categories
CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    color text,
    icon text,
    sort_order integer DEFAULT 0
);

-- Tabla: clients
CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    full_name text NOT NULL,
    phone text,
    email text,
    created_at timestamp with time zone DEFAULT now()
);

-- Tabla: sales_channels
CREATE TABLE public.sales_channels (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'retail'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sales_channels_type_check CHECK ((type = ANY (ARRAY['retail'::text, 'delivery'::text, 'wholesale'::text, 'ecommerce'::text])))
);

-- Tabla: suppliers
CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    contact_name text,
    phone text,
    email text,
    address text,
    delivery_day text,
    delivery_time_days integer DEFAULT 1,
    notes_delivery text,
    order_day text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: role_permissions (static role -> permission catalog)
CREATE TABLE public.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role public.user_role NOT NULL,
    permission text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Tabla: employees
CREATE TABLE public.employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    branch_id uuid,
    full_name text NOT NULL,
    email text,
    phone text,
    "position" public.employee_position NOT NULL,
    base_salary numeric(15,2) DEFAULT 0 NOT NULL,
    hire_date date DEFAULT CURRENT_DATE NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    salary_type public.salary_type DEFAULT 'monthly'::public.salary_type
);

-- Tabla: employee_custom_permissions (per-user permission overrides)
CREATE TABLE public.employee_custom_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    user_id uuid NOT NULL,
    access_dashboard boolean DEFAULT false,
    access_pos boolean DEFAULT false,
    access_orders boolean DEFAULT false,
    access_inventory boolean DEFAULT false,
    access_products boolean DEFAULT false,
    access_employees boolean DEFAULT false,
    access_payroll boolean DEFAULT false,
    access_reports boolean DEFAULT false,
    access_branches boolean DEFAULT false,
    access_deliveries boolean DEFAULT false,
    access_cash_closing boolean DEFAULT false,
    pos_checkout boolean DEFAULT false,
    pos_register_only boolean DEFAULT false,
    pos_full_access boolean DEFAULT false,
    manage_branch_users boolean DEFAULT false,
    manage_all_users boolean DEFAULT false,
    view_own_branch_only boolean DEFAULT true,
    view_own_data_only boolean DEFAULT false,
    view_all_branches boolean DEFAULT false,
    view_all_payroll boolean DEFAULT false,
    modified_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: inventory_items (raw materials & supplies catalog)
CREATE TABLE public.inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    unit public.inventory_unit DEFAULT 'unidad'::public.inventory_unit NOT NULL,
    min_stock_alert numeric(10,3) DEFAULT 5,
    supplier_id uuid,
    sku text,
    unit_cost numeric(15,2),
    buying_unit text,
    usage_unit text,
    conversion_factor numeric(15,4) DEFAULT 1,
    last_purchase_price numeric(15,2),
    weighted_avg_cost numeric(15,2),
    item_type public.inventory_item_type DEFAULT 'raw_material'::public.inventory_item_type,
    image_url text
);
COMMENT ON COLUMN public.inventory_items.item_type IS 'Distinguishes between raw materials (ingredients) and supplies (operational items like detergent, packaging)';

-- Tabla: products
CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    category_id uuid,
    name text NOT NULL,
    description text,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    cost_price numeric(10,2) DEFAULT 0,
    sku text,
    tax_rate numeric(5,4) DEFAULT 0,
    active boolean DEFAULT true,
    image_url text,
    created_at timestamp with time zone DEFAULT now(),
    ignore_promotions boolean DEFAULT false,
    cost numeric(10,2) DEFAULT 0,
    type text DEFAULT 'standard'::text
);
COMMENT ON COLUMN public.products.cost IS 'Estimated unit cost for COGS calculation';

-- Tabla: branch_ingredients (per-branch stock of inventory_items)
CREATE TABLE public.branch_ingredients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    branch_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    current_stock numeric(10,3) DEFAULT 0,
    last_updated timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    min_stock_alert double precision DEFAULT 0
);
COMMENT ON COLUMN public.branch_ingredients.min_stock_alert IS 'Low stock threshold in Base/Usage Units (e.g. grams)';

-- Tabla: product_recipes (BOM: product -> required ingredients)
CREATE TABLE public.product_recipes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    quantity_required numeric(10,4) NOT NULL
);

-- Tabla: product_combos (combo product -> component products)
CREATE TABLE public.product_combos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_product_id uuid,
    child_product_id uuid,
    quantity integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);
COMMENT ON TABLE public.product_combos IS 'Links a parent Combo product to its component child products';

-- Tabla: product_prices (per channel/branch price overrides)
CREATE TABLE public.product_prices (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    product_id uuid NOT NULL,
    channel_id uuid,
    branch_id uuid,
    price numeric(12,2),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: promotions
CREATE TABLE public.promotions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    type text NOT NULL,
    value numeric(10,2) DEFAULT 0 NOT NULL,
    scope_channels jsonb DEFAULT '[]'::jsonb,
    scope_branches jsonb DEFAULT '[]'::jsonb,
    start_date timestamp with time zone DEFAULT now() NOT NULL,
    end_date timestamp with time zone,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    config jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT promotions_type_check CHECK ((type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text, 'combo'::text, 'buy_x_get_y'::text, 'product_discount'::text, 'category_discount'::text, 'global_discount'::text])))
);
COMMENT ON COLUMN public.promotions.config IS 'Dynamic configuration for complex promotions like buy_x_get_y';

-- Tabla: branch_channels (which sales channels are active per branch)
CREATE TABLE public.branch_channels (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    channel_id uuid NOT NULL,
    is_active boolean DEFAULT true,
    commission_percentage numeric(5,2) DEFAULT 0,
    monthly_operating_cost numeric(12,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: devices (registered POS terminals)
CREATE TABLE public.devices (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'active'::text,
    type text DEFAULT 'pos_terminal'::text,
    fingerprint text,
    app_version text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT devices_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'inactive'::text, 'revoked'::text])))
);

-- Tabla: tables (restaurant/dine-in tables)
CREATE TABLE public.tables (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'available'::text,
    capacity integer DEFAULT 4,
    zone text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    CONSTRAINT tables_status_check CHECK ((status = ANY (ARRAY['available'::text, 'occupied'::text, 'reserved'::text, 'cleaning'::text])))
);

-- Tabla: shifts (cash register / work shifts)
CREATE TABLE public.shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    branch_id uuid NOT NULL,
    user_id uuid NOT NULL,
    start_time timestamp with time zone DEFAULT now() NOT NULL,
    end_time timestamp with time zone,
    initial_cash numeric(10,2) DEFAULT 0,
    final_cash numeric(10,2),
    expected_cash numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    status public.shift_status DEFAULT 'open'::public.shift_status,
    shift_type public.shift_type,
    closing_metadata jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    synced boolean DEFAULT false,
    observations text,
    last_seen_at timestamp with time zone DEFAULT now(),
    closed_by_method text,
    CONSTRAINT shifts_closed_by_method_check CHECK ((closed_by_method = ANY (ARRAY['pos'::text, 'remote'::text])))
);
COMMENT ON COLUMN public.shifts.shift_type IS 'Tipo de turno: mañana (6AM-2PM), tarde (2PM-12AM), o turno_unico';
COMMENT ON COLUMN public.shifts.closing_metadata IS 'Stores PanPanocha and Siigo closing details as JSON: {panpanocha: {...}, siigo: {...}}';
COMMENT ON COLUMN public.shifts.updated_at IS 'Last modification timestamp';
COMMENT ON COLUMN public.shifts.synced IS 'Whether shift has been synced from POS to Portal';
COMMENT ON COLUMN public.shifts.observations IS 'Additional notes about the shift/closing';
COMMENT ON COLUMN public.shifts.last_seen_at IS 'Timestamp of the last heartbeat from the POS device';
COMMENT ON COLUMN public.shifts.closed_by_method IS 'Indicates if the shift was closed locally by the POS or remotely by an admin';

-- Tabla: sales
CREATE TABLE public.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    branch_id uuid NOT NULL,
    shift_id uuid,
    total_amount numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    synced boolean DEFAULT false,
    status public.sale_status DEFAULT 'pending'::public.sale_status,
    payment_method public.payment_method DEFAULT 'cash_panpanocha'::public.payment_method,
    channel_id uuid
);
COMMENT ON COLUMN public.sales.channel_id IS 'Reference to the sales channel (e.g. Retail, Delivery) where this sale occurred';

-- Tabla: sale_items
CREATE TABLE public.sale_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    sale_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(10,2) DEFAULT 1 NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) GENERATED ALWAYS AS ((quantity * unit_price)) STORED,
    tax_amount numeric(10,2) DEFAULT 0,
    promotion_id uuid,
    discount_amount numeric DEFAULT 0
);
COMMENT ON COLUMN public.sale_items.promotion_id IS 'Reference to the promotion applied to this line item';
COMMENT ON COLUMN public.sale_items.discount_amount IS 'The total discount value applied to this line item (unit_discount * quantity)';

-- Tabla: orders (dine-in / kitchen orders)
-- NOTE: table_id has no FK constraint in the source backup (see report).
CREATE TABLE public.orders (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    branch_id uuid,
    sale_id uuid,
    table_id uuid,
    shift_id uuid,
    created_by uuid,
    total_amount numeric(12,2) DEFAULT 0,
    status text DEFAULT 'pending'::text,
    customer_name text,
    diners integer DEFAULT 1,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT now(),
    synced boolean DEFAULT false,
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'ready'::text, 'served'::text, 'cancelled'::text, 'completed'::text])))
);

-- Tabla: order_items
CREATE TABLE public.order_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    total_price numeric(12,2) NOT NULL,
    notes text
);

-- Tabla: expenses
CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    branch_id uuid NOT NULL,
    shift_id uuid,
    description text NOT NULL,
    amount numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    category public.expense_category DEFAULT 'otro'::public.expense_category
);

-- Tabla: deliveries (internal/own deliveries)
CREATE TABLE public.deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    branch_id uuid,
    assigned_driver text,
    customer_name text,
    customer_phone text,
    customer_address text,
    delivery_fee numeric(15,2) DEFAULT 0,
    status public.delivery_status DEFAULT 'pending'::public.delivery_status,
    notes text,
    product_details text,
    delivery_receipt_url text,
    client_payment_proof_url text,
    delivery_document_id text,
    delivery_name text,
    last_edited_by uuid,
    last_edited_at timestamp with time zone,
    last_edit_type public.edit_type,
    created_at timestamp with time zone DEFAULT now()
);

-- Tabla: rappi_deliveries (Rappi 3rd-party delivery integration)
CREATE TABLE public.rappi_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    branch_id uuid,
    rappi_order_id text,
    status public.rappi_order_status DEFAULT 'created'::public.rappi_order_status,
    customer_name text,
    customer_phone text,
    customer_address text,
    product_details text,
    total_value numeric(15,2) DEFAULT 0,
    delivery_fee numeric(15,2) DEFAULT 0,
    assigned_driver text,
    ticket_url text,
    rappi_receipt_url text,
    order_ready_url text,
    notes text,
    last_edited_by uuid,
    last_edited_at timestamp with time zone,
    last_edit_type public.edit_type,
    created_at timestamp with time zone DEFAULT now()
);

-- Tabla: stock_reservations (transient stock holds for carts/orders/deliveries)
CREATE TABLE public.stock_reservations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(10,2) NOT NULL,
    source_type text NOT NULL,
    source_id uuid NOT NULL,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT stock_reservations_source_type_check CHECK ((source_type = ANY (ARRAY['order'::text, 'cart'::text, 'delivery'::text]))),
    CONSTRAINT stock_reservations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'fulfilled'::text, 'released'::text])))
);

-- Tabla: tip_distributions
CREATE TABLE public.tip_distributions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    shift_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    employee_name text,
    amount numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    synced boolean DEFAULT false
);

-- Tabla: payroll
CREATE TABLE public.payroll (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    payment_date date,
    base_amount numeric(15,2) DEFAULT 0 NOT NULL,
    bonuses numeric(15,2) DEFAULT 0,
    deductions numeric(15,2) DEFAULT 0,
    net_amount numeric(15,2) DEFAULT 0,
    payment_type text DEFAULT 'on_time'::text,
    status public.payroll_status DEFAULT 'pending'::public.payroll_status,
    payment_proof_url text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    payment_method public.payment_method DEFAULT 'transfer'::public.payment_method
);

-- Tabla: payroll_items (line-item breakdown of a payroll record)
CREATE TABLE public.payroll_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payroll_id uuid NOT NULL,
    item_type text NOT NULL,
    concept text NOT NULL,
    amount numeric(15,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Tabla: purchase_orders
CREATE TABLE public.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    status public.purchase_order_status DEFAULT 'pending'::public.purchase_order_status,
    payment_status public.payroll_status DEFAULT 'pending'::public.payroll_status,
    total_amount numeric(15,2) DEFAULT 0,
    invoice_url text,
    payment_proof_url text,
    last_modified_by uuid,
    last_modified_at timestamp with time zone,
    last_edit_type public.edit_type,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tabla: purchase_order_items
CREATE TABLE public.purchase_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    item_id uuid NOT NULL,
    quantity numeric(15,3) NOT NULL,
    unit_price numeric(15,2),
    created_at timestamp with time zone DEFAULT now()
);

-- Tabla: provisioning_sessions (device pairing/onboarding flow)
CREATE TABLE public.provisioning_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fingerprint text NOT NULL,
    device_name text,
    device_type text DEFAULT 'pos'::text,
    ip_address text,
    status text DEFAULT 'pending'::text,
    auth_token_hash text,
    organization_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone
);

-- =====================================================================
-- PRIMARY KEY / UNIQUE CONSTRAINTS
-- =====================================================================

ALTER TABLE ONLY public.organizations ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.branches ADD CONSTRAINT branches_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.categories ADD CONSTRAINT categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.clients ADD CONSTRAINT clients_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sales_channels ADD CONSTRAINT sales_channels_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sales_channels ADD CONSTRAINT sales_channels_organization_id_name_key UNIQUE (organization_id, name);

ALTER TABLE ONLY public.suppliers ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.role_permissions ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.role_permissions ADD CONSTRAINT role_permissions_role_permission_key UNIQUE (role, permission);

ALTER TABLE ONLY public.employees ADD CONSTRAINT employees_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.employee_custom_permissions ADD CONSTRAINT employee_custom_permissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.employee_custom_permissions ADD CONSTRAINT employee_custom_permissions_employee_id_key UNIQUE (employee_id);

ALTER TABLE ONLY public.inventory_items ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.inventory_items ADD CONSTRAINT inventory_items_sku_key UNIQUE (sku);

ALTER TABLE ONLY public.products ADD CONSTRAINT products_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.branch_ingredients ADD CONSTRAINT branch_ingredients_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.branch_ingredients ADD CONSTRAINT unique_branch_ingredient UNIQUE (branch_id, ingredient_id);

ALTER TABLE ONLY public.product_recipes ADD CONSTRAINT product_recipes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.product_recipes ADD CONSTRAINT unique_product_ingredient UNIQUE (product_id, ingredient_id);

ALTER TABLE ONLY public.product_combos ADD CONSTRAINT product_combos_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.product_combos ADD CONSTRAINT product_combos_parent_product_id_child_product_id_key UNIQUE (parent_product_id, child_product_id);

ALTER TABLE ONLY public.product_prices ADD CONSTRAINT product_prices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.product_prices ADD CONSTRAINT product_prices_organization_id_product_id_channel_id_branch_key UNIQUE (organization_id, product_id, channel_id, branch_id);

ALTER TABLE ONLY public.promotions ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.branch_channels ADD CONSTRAINT branch_channels_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.branch_channels ADD CONSTRAINT branch_channels_branch_id_channel_id_key UNIQUE (branch_id, channel_id);

ALTER TABLE ONLY public.devices ADD CONSTRAINT devices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tables ADD CONSTRAINT tables_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.shifts ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sales ADD CONSTRAINT sales_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sale_items ADD CONSTRAINT sale_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.orders ADD CONSTRAINT orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.order_items ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.expenses ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.deliveries ADD CONSTRAINT deliveries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.rappi_deliveries ADD CONSTRAINT rappi_deliveries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.stock_reservations ADD CONSTRAINT stock_reservations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tip_distributions ADD CONSTRAINT tip_distributions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payroll ADD CONSTRAINT payroll_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payroll_items ADD CONSTRAINT payroll_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.purchase_orders ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.purchase_order_items ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.provisioning_sessions ADD CONSTRAINT provisioning_sessions_pkey PRIMARY KEY (id);

-- =====================================================================
-- FOREIGN KEY CONSTRAINTS
-- =====================================================================

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.sales_channels
    ADD CONSTRAINT sales_channels_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.employee_custom_permissions
    ADD CONSTRAINT employee_custom_permissions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.employee_custom_permissions
    ADD CONSTRAINT employee_custom_permissions_modified_by_fkey FOREIGN KEY (modified_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.employee_custom_permissions
    ADD CONSTRAINT employee_custom_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.branch_ingredients
    ADD CONSTRAINT branch_ingredients_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.branch_ingredients
    ADD CONSTRAINT branch_ingredients_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.branch_ingredients
    ADD CONSTRAINT branch_ingredients_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.product_recipes
    ADD CONSTRAINT product_recipes_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.product_recipes
    ADD CONSTRAINT product_recipes_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.product_combos
    ADD CONSTRAINT product_combos_child_product_id_fkey FOREIGN KEY (child_product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.product_combos
    ADD CONSTRAINT product_combos_parent_product_id_fkey FOREIGN KEY (parent_product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.product_prices
    ADD CONSTRAINT product_prices_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.product_prices
    ADD CONSTRAINT product_prices_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.sales_channels(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.product_prices
    ADD CONSTRAINT product_prices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.product_prices
    ADD CONSTRAINT product_prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.branch_channels
    ADD CONSTRAINT branch_channels_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.branch_channels
    ADD CONSTRAINT branch_channels_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.sales_channels(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.branch_channels
    ADD CONSTRAINT branch_channels_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.sales_channels(id);
ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id);

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);
ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id);
ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);
ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE SET NULL;
-- NOTE: orders.table_id has NO foreign key in the source backup (see report - dangling reference risk).

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id);

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.rappi_deliveries
    ADD CONSTRAINT rappi_deliveries_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.rappi_deliveries
    ADD CONSTRAINT rappi_deliveries_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tip_distributions
    ADD CONSTRAINT tip_distributions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.tip_distributions
    ADD CONSTRAINT tip_distributions_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE CASCADE;
-- NOTE: tip_distributions.employee_id has NO foreign key in the source backup (see report).

ALTER TABLE ONLY public.payroll
    ADD CONSTRAINT payroll_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.payroll
    ADD CONSTRAINT payroll_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.payroll
    ADD CONSTRAINT payroll_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payroll_items
    ADD CONSTRAINT payroll_items_payroll_id_fkey FOREIGN KEY (payroll_id) REFERENCES public.payroll(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_last_modified_by_fkey FOREIGN KEY (last_modified_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.provisioning_sessions
    ADD CONSTRAINT provisioning_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

-- =====================================================================
-- INDEXES
-- =====================================================================

CREATE INDEX idx_branch_channels_lookup ON public.branch_channels USING btree (branch_id, channel_id);
CREATE INDEX idx_inventory_items_sku ON public.inventory_items USING btree (sku);
CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);
CREATE INDEX idx_orders_branch ON public.orders USING btree (branch_id);
CREATE INDEX idx_orders_organization ON public.orders USING btree (organization_id);
CREATE INDEX idx_orders_shift ON public.orders USING btree (shift_id);
CREATE INDEX idx_orders_status ON public.orders USING btree (status);
CREATE INDEX idx_product_prices_lookup ON public.product_prices USING btree (product_id, branch_id, channel_id);
CREATE INDEX idx_product_prices_product ON public.product_prices USING btree (product_id);
CREATE INDEX idx_products_sku ON public.products USING btree (sku);
CREATE INDEX idx_promotions_config ON public.promotions USING gin (config);
CREATE INDEX idx_provisioning_sessions_fingerprint ON public.provisioning_sessions USING btree (fingerprint);
CREATE INDEX idx_provisioning_sessions_org_id ON public.provisioning_sessions USING btree (organization_id);
CREATE INDEX idx_rappi_deliveries_branch ON public.rappi_deliveries USING btree (branch_id);
CREATE INDEX idx_sale_items_promotion_id ON public.sale_items USING btree (promotion_id);
CREATE INDEX idx_sales_channel_id ON public.sales USING btree (channel_id);
CREATE INDEX idx_stock_reservations_product ON public.stock_reservations USING btree (product_id);
CREATE INDEX idx_tables_branch ON public.tables USING btree (branch_id);
CREATE INDEX idx_tip_distributions_employee ON public.tip_distributions USING btree (employee_id);
CREATE INDEX idx_tip_distributions_shift ON public.tip_distributions USING btree (shift_id);

-- =====================================================================
-- FUNCTIONS (business logic)
-- =====================================================================

CREATE FUNCTION public.deduct_ingredients_on_sale() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    rec RECORD;
    sale_branch_id UUID;
    qty_needed NUMERIC;
BEGIN
    -- 1. Get Branch
    SELECT branch_id INTO sale_branch_id FROM sales WHERE id = NEW.sale_id;
    IF sale_branch_id IS NULL THEN
       -- Fallback if insert order is tricky, but FK ensures it exists.
       RETURN NEW;
    END IF;
    -- 2. Loop Ingredients
    FOR rec IN
        SELECT ingredient_id, quantity_required
        FROM product_recipes
        WHERE product_id = NEW.product_id
    LOOP
        qty_needed := NEW.quantity * rec.quantity_required;

        -- 3. Deduct
        UPDATE branch_ingredients
        SET current_stock = current_stock - qty_needed, last_updated = NOW()
        WHERE branch_id = sale_branch_id AND ingredient_id = rec.ingredient_id;
    END LOOP;

    RETURN NEW;
END;
$$;

CREATE FUNCTION public.get_branch_products_stock(p_branch_id uuid) RETURNS TABLE(product_id uuid, stock numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id as product_id,
        COALESCE(
            (
                -- Calculate simplified stock based on recipe (min ingredient stock)
                -- This is a simplified view; accurate stock requires detailed inventory calculation
                SELECT MIN(
                    COALESCE(bi.current_stock, 0) / pr.quantity_required
                )
                FROM public.product_recipes pr
                JOIN public.branch_ingredients bi ON bi.ingredient_id = pr.ingredient_id
                WHERE pr.product_id = p.id AND bi.branch_id = p_branch_id
            ),
            0
        ) as stock
    FROM public.products p
    LEFT JOIN public.product_prices pp ON pp.product_id = p.id AND pp.branch_id = p_branch_id
    WHERE
        p.active = true
        AND (pp.is_active IS NULL OR pp.is_active = true);
        -- Logic: Global active AND (No specific branch override OR Branch override is true)
END;
$$;

CREATE FUNCTION public.get_supplier_stats() RETURNS TABLE(supplier_id uuid, total_purchased numeric, current_debt numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id as supplier_id,
        COALESCE(SUM(CASE WHEN po.status = 'received' THEN po.total_amount ELSE 0 END), 0) as total_purchased,
        COALESCE(SUM(CASE
            WHEN po.payment_status = 'pending' AND po.status IN ('pending', 'approved', 'received')
            THEN po.total_amount
            ELSE 0
        END), 0) as current_debt
    FROM
        suppliers s
    LEFT JOIN
        purchase_orders po ON s.id = po.supplier_id
    GROUP BY
        s.id;
END;
$$;

CREATE FUNCTION public.update_provisioning_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_shifts_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.upsert_sales_batch(payload jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    sale_record jsonb;
    item_record jsonb;
    v_sale_id uuid;
    v_success_count int := 0;
    v_error_count int := 0;
    v_errors jsonb := '[]'::jsonb;
BEGIN
    -- Iterate through each sale in the payload
    FOR sale_record IN SELECT * FROM jsonb_array_elements(payload)
    LOOP
        BEGIN
            -- Extract Sale ID
            v_sale_id := (sale_record->>'id')::uuid;

            -- 1. Upsert Sale Header
            INSERT INTO public.sales (
                id, organization_id, branch_id, shift_id,
                total_amount, payment_method, status,
                channel_id, created_at, synced
            )
            VALUES (
                v_sale_id,
                (sale_record->>'organization_id')::uuid,
                (sale_record->>'branch_id')::uuid,
                (sale_record->>'shift_id')::uuid,
                (sale_record->>'total_amount')::numeric,
                (sale_record->>'payment_method')::public.payment_method,
                (sale_record->>'status')::public.sale_status,
                (sale_record->>'channel_id')::uuid,
                (sale_record->>'created_at')::timestamptz,
                true
            )
            ON CONFLICT (id) DO UPDATE SET
                total_amount = EXCLUDED.total_amount,
                payment_method = EXCLUDED.payment_method,
                status = EXCLUDED.status,
                synced = true;

            -- 2. Upsert Sale Items (Iterate through items array in JSON)
            IF sale_record ? 'items' AND jsonb_array_length(sale_record->'items') > 0 THEN
                FOR item_record IN SELECT * FROM jsonb_array_elements(sale_record->'items')
                LOOP
                    INSERT INTO public.sale_items (
                        id, organization_id, sale_id, product_id,
                        quantity, unit_price, tax_amount,
                        promotion_id, discount_amount
                    )
                    VALUES (
                        (item_record->>'id')::uuid,
                        (sale_record->>'organization_id')::uuid,
                        v_sale_id,
                        (item_record->>'product_id')::uuid,
                        (item_record->>'quantity')::numeric,
                        (item_record->>'unit_price')::numeric,
                        COALESCE((item_record->>'tax_amount')::numeric, 0),
                        (item_record->>'promotion_id')::uuid,
                        COALESCE((item_record->>'discount_amount')::numeric, 0)
                    )
                    -- total_price is GENERATED ALWAYS (quantity * unit_price); cannot be inserted
                    ON CONFLICT (id) DO UPDATE SET
                        quantity = EXCLUDED.quantity,
                        unit_price = EXCLUDED.unit_price,
                        tax_amount = EXCLUDED.tax_amount,
                        promotion_id = EXCLUDED.promotion_id,
                        discount_amount = EXCLUDED.discount_amount;
                END LOOP;
            END IF;

            v_success_count := v_success_count + 1;

        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            v_errors := v_errors || jsonb_build_object(
                'sale_id', v_sale_id,
                'error', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success_count', v_success_count,
        'error_count', v_error_count,
        'errors', v_errors
    );
END;
$$;

CREATE FUNCTION public.verify_action_pin(input_pin text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  valid_user boolean;
BEGIN
  -- Roles allowed: 'owner', 'admin', 'dev'
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE pin_code = input_pin
    AND role IN ('owner', 'admin', 'dev')
    AND (active = TRUE)
  ) INTO valid_user;

  RETURN valid_user;
END;
$$;

-- RLS helper: resolves the caller's organization_id from either auth flow used
-- by the app. Staff sign in with email/password (auth.uid() = public.users.id,
-- see apps/portal/src/app/login/page.tsx); POS devices sign in via PIN through
-- a throwaway device user that carries organization_id in its JWT user_metadata
-- (see apps/portal/src/app/api/auth/pin-login/route.ts). SECURITY DEFINER avoids
-- RLS recursion when querying public.users from within a policy.
CREATE FUNCTION public.get_jwt_organization_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT COALESCE(
        (auth.jwt() -> 'user_metadata' ->> 'organization_id')::uuid,
        (SELECT organization_id FROM public.users WHERE id = auth.uid())
    );
$$;

GRANT ALL ON FUNCTION public.deduct_ingredients_on_sale() TO authenticated;
GRANT ALL ON FUNCTION public.get_branch_products_stock(p_branch_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_supplier_stats() TO authenticated;
GRANT ALL ON FUNCTION public.get_supplier_stats() TO service_role;
GRANT ALL ON FUNCTION public.update_provisioning_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_shifts_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.upsert_sales_batch(payload jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.verify_action_pin(input_pin text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_jwt_organization_id() TO authenticated, anon;

-- =====================================================================
-- TRIGGERS
-- =====================================================================

CREATE TRIGGER shifts_updated_at_trigger BEFORE UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.update_shifts_updated_at();
CREATE TRIGGER trg_deduct_ingredients AFTER INSERT ON public.sale_items FOR EACH ROW EXECUTE FUNCTION public.deduct_ingredients_on_sale();
CREATE TRIGGER trg_provisioning_updated_at BEFORE UPDATE ON public.provisioning_sessions FOR EACH ROW EXECUTE FUNCTION public.update_provisioning_updated_at();

-- =====================================================================
-- ROW LEVEL SECURITY
-- The source backup only had RLS+policies on branch_channels (and that
-- policy only checked auth.role() = 'authenticated', with no tenant
-- scoping at all); 7 more tables had RLS enabled with ZERO policies
-- (total lockout for anon/authenticated), and the remaining 27 tables
-- had no RLS at all (fully exposed to anon/authenticated via GRANTs).
-- All 35 tables now get RLS enabled plus an organization-scoped policy
-- built on get_jwt_organization_id(). service_role (used by all backend
-- API routes) bypasses RLS entirely, so this does not affect existing
-- app behavior - it only closes the gap for any direct anon/authenticated
-- access (e.g. the portal's browser client in lib/supabase-server.ts).
-- =====================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.organizations TO authenticated
    USING (id = public.get_jwt_organization_id())
    WITH CHECK (id = public.get_jwt_organization_id());

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.branches TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.users TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.categories TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.clients TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.sales_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.sales_channels TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.suppliers TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

-- role_permissions is a global role->permission catalog, not tenant data.
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON public.role_permissions FOR SELECT TO authenticated
    USING (true);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.employees TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.employee_custom_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.employee_custom_permissions TO authenticated
    USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_custom_permissions.employee_id AND e.organization_id = public.get_jwt_organization_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_custom_permissions.employee_id AND e.organization_id = public.get_jwt_organization_id()));

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.inventory_items TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.products TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.branch_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.branch_ingredients TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.product_recipes TO authenticated
    USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_recipes.product_id AND p.organization_id = public.get_jwt_organization_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_recipes.product_id AND p.organization_id = public.get_jwt_organization_id()));

ALTER TABLE public.product_combos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.product_combos TO authenticated
    USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_combos.parent_product_id AND p.organization_id = public.get_jwt_organization_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_combos.parent_product_id AND p.organization_id = public.get_jwt_organization_id()));

ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.product_prices TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.promotions TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());
CREATE POLICY "anon_read_active" ON public.promotions FOR SELECT TO anon
    USING (is_active = true);

ALTER TABLE public.branch_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.branch_channels TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.devices TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.tables TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.shifts TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.sales TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.sale_items TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.orders TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.order_items TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.expenses TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.deliveries TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.rappi_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.rappi_deliveries TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.stock_reservations TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.tip_distributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.tip_distributions TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.payroll TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.payroll_items TO authenticated
    USING (EXISTS (SELECT 1 FROM public.payroll pr WHERE pr.id = payroll_items.payroll_id AND pr.organization_id = public.get_jwt_organization_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.payroll pr WHERE pr.id = payroll_items.payroll_id AND pr.organization_id = public.get_jwt_organization_id()));

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.purchase_orders TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.purchase_order_items TO authenticated
    USING (EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_items.order_id AND po.organization_id = public.get_jwt_organization_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_items.order_id AND po.organization_id = public.get_jwt_organization_id()));

ALTER TABLE public.provisioning_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.provisioning_sessions TO authenticated
    USING (organization_id = public.get_jwt_organization_id())
    WITH CHECK (organization_id = public.get_jwt_organization_id());

-- =====================================================================
-- GRANTS (table-level privileges for PostgREST roles)
-- =====================================================================

GRANT ALL ON TABLE public.branch_channels TO authenticated;
GRANT ALL ON TABLE public.branch_ingredients TO authenticated;
GRANT ALL ON TABLE public.branches TO authenticated;
GRANT ALL ON TABLE public.categories TO authenticated;
GRANT ALL ON TABLE public.clients TO authenticated;
GRANT ALL ON TABLE public.deliveries TO authenticated;
GRANT ALL ON TABLE public.devices TO authenticated;
GRANT ALL ON TABLE public.devices TO service_role;
GRANT ALL ON TABLE public.employee_custom_permissions TO authenticated;
GRANT ALL ON TABLE public.employees TO authenticated;
GRANT ALL ON TABLE public.expenses TO authenticated;
GRANT ALL ON TABLE public.inventory_items TO authenticated;
GRANT ALL ON TABLE public.order_items TO authenticated;
GRANT ALL ON TABLE public.order_items TO service_role;
GRANT ALL ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;
GRANT ALL ON TABLE public.organizations TO authenticated;
GRANT ALL ON TABLE public.payroll TO authenticated;
GRANT ALL ON TABLE public.payroll_items TO authenticated;
GRANT ALL ON TABLE public.product_combos TO authenticated;
GRANT ALL ON TABLE public.product_prices TO authenticated;
GRANT ALL ON TABLE public.product_recipes TO authenticated;
GRANT ALL ON TABLE public.products TO authenticated;
GRANT ALL ON TABLE public.promotions TO authenticated;
GRANT SELECT ON TABLE public.promotions TO anon;
GRANT ALL ON TABLE public.provisioning_sessions TO authenticated;
GRANT ALL ON TABLE public.provisioning_sessions TO service_role;
GRANT ALL ON TABLE public.purchase_order_items TO authenticated;
GRANT ALL ON TABLE public.purchase_order_items TO service_role;
GRANT ALL ON TABLE public.purchase_orders TO authenticated;
GRANT ALL ON TABLE public.purchase_orders TO service_role;
GRANT ALL ON TABLE public.rappi_deliveries TO authenticated;
GRANT ALL ON TABLE public.rappi_deliveries TO service_role;
GRANT ALL ON TABLE public.role_permissions TO authenticated;
GRANT ALL ON TABLE public.sale_items TO authenticated;
GRANT ALL ON TABLE public.sales TO authenticated;
GRANT ALL ON TABLE public.sales_channels TO authenticated;
GRANT ALL ON TABLE public.shifts TO authenticated;
GRANT ALL ON TABLE public.stock_reservations TO authenticated;
GRANT ALL ON TABLE public.stock_reservations TO service_role;
GRANT ALL ON TABLE public.suppliers TO authenticated;
GRANT ALL ON TABLE public.suppliers TO service_role;
GRANT ALL ON TABLE public.tables TO authenticated;
GRANT ALL ON TABLE public.tables TO service_role;
GRANT ALL ON TABLE public.tip_distributions TO authenticated;
GRANT ALL ON TABLE public.tip_distributions TO service_role;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;
