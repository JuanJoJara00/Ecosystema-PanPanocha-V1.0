-- SIIGO CLOSINGS SCHEMA
-- Parallel structure to mys_closings for the Siigo accounting closing process.

-- 1. Main Closing Table
create table if not exists siigo_closings (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    branch_id uuid references branches(id),
    closed_by uuid, -- References auth.users or profiles
    shift text not null, -- 'mañana', 'tarde', 'unico'
    
    -- Monetary Values
    base_cash decimal(12,2) default 0,
    sales_cash decimal(12,2) default 0,
    sales_card decimal(12,2) default 0,
    sales_transfer decimal(12,2) default 0,
    
    expenses_total decimal(12,2) default 0,
    tips_total decimal(12,2) default 0,
    
    cash_audit_count decimal(12,2) default 0, -- Arqueo Físico
    
    notes text -- Contains URLs to proofs in markdown format
);

-- 2. Closing Products (Detailed Sales)
create table if not exists siigo_closing_products (
    id uuid default gen_random_uuid() primary key,
    closing_id uuid references siigo_closings(id) on delete cascade,
    product_id uuid references products(id),
    quantity integer default 1,
    unit_price decimal(12,2) default 0,
    
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Closing Movements (Expenses and Tips)
create table if not exists siigo_closing_movements (
    id uuid default gen_random_uuid() primary key,
    closing_id uuid references siigo_closings(id) on delete cascade,
    
    type text not null, -- 'expense' or 'tip'
    amount decimal(12,2) default 0,
    description text,
    
    evidence_url text, -- For receipts
    employee_id uuid references employees(id), -- For tips
    
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (Standard)
alter table siigo_closings enable row level security;
alter table siigo_closing_products enable row level security;
alter table siigo_closing_movements enable row level security;

-- Policies for closings
create policy "Enable read access for authenticated users" on siigo_closings for select to authenticated using (true);
create policy "Enable insert for authenticated users" on siigo_closings for insert to authenticated with check (true);

-- Policies for products
create policy "Enable read access for authenticated users" on siigo_closing_products for select to authenticated using (true);
create policy "Enable insert for authenticated users" on siigo_closing_products for insert to authenticated with check (true);

-- Policies for movements
create policy "Enable read access for authenticated users" on siigo_closing_movements for select to authenticated using (true);
create policy "Enable insert for authenticated users" on siigo_closing_movements for insert to authenticated with check (true);
