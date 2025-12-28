
-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Extends Supabase Auth)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  role text check (role in ('admin', 'cajero', 'cocina', 'operaciones')) default 'cajero',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. SEDES (Branches)
create table branches (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  address text,
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. INVENTORY & PRODUCTS
create table products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  price decimal(10,2) not null,
  category text, -- 'pan', 'bebida', 'desayuno'
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table inventory_items (
  id uuid default uuid_generate_v4() primary key,
  name text not null, -- e.g. 'Harina', 'Huevos'
  unit text not null, -- 'kg', 'unidad', 'litro'
  min_stock_alert decimal(10,2) default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table branch_inventory (
  id uuid default uuid_generate_v4() primary key,
  branch_id uuid references branches(id) on delete cascade not null,
  item_id uuid references inventory_items(id) on delete cascade not null,
  quantity decimal(10,2) default 0,
  last_updated timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(branch_id, item_id)
);

-- 4. SALES & CASH CLOSING
create table cash_closings (
  id uuid default uuid_generate_v4() primary key,
  branch_id uuid references branches(id) not null,
  opened_by uuid references profiles(id) not null,
  closed_by uuid references profiles(id),
  opening_time timestamp with time zone default timezone('utc'::text, now()) not null,
  closing_time timestamp with time zone,
  start_cash decimal(10,2) default 0,
  end_cash_system decimal(10,2) default 0, -- Calculated by system
  end_cash_real decimal(10,2) default 0,   -- Counted by cashier
  difference decimal(10,2) generated always as (end_cash_real - end_cash_system) stored,
  notes text,
  status text check (status in ('open', 'closed', 'reviewed')) default 'open'
);

-- 5. SUPPLIERS & ORDERS
create table suppliers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  contact_name text,
  phone text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table purchase_orders (
  id uuid default uuid_generate_v4() primary key,
  supplier_id uuid references suppliers(id) not null,
  branch_id uuid references branches(id) not null,
  requested_by uuid references profiles(id) not null,
  status text check (status in ('draft', 'pending', 'received', 'cancelled')) default 'draft',
  total_amount decimal(10,2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES (Basic Setup)
alter table profiles enable row level security;
alter table branches enable row level security;
alter table products enable row level security;
alter table inventory_items enable row level security;
alter table branch_inventory enable row level security;
alter table cash_closings enable row level security;

-- Allow read access to authenticated users
create policy "Authenticated users can view profiles" on profiles for select using (auth.role() = 'authenticated');
create policy "Authenticated users can view branches" on branches for select using (auth.role() = 'authenticated');

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'cajero'); -- default to cajero
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Seed some initial data
insert into branches (name, address) values ('Sede Cerritos', 'Cerritos, Pereira'), ('Sede Dosquebradas', 'Dosquebradas'), ('Sede Centro (Rappi)', 'Pereira Centro');
