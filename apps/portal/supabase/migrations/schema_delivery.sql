-- Branches (Sedes) Table Extensions
-- The branches table likely exists (used by other modules), but we ensure it has all fields needed for management.

-- Base table (if not exists)
create table if not exists branches (
    id uuid default gen_random_uuid() primary key,
    name text not null unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add useful columns if they don't exist
alter table branches add column if not exists address text;
alter table branches add column if not exists phone text;
alter table branches add column if not exists city text;
alter table branches add column if not exists manager_name text;
alter table branches add column if not exists is_active boolean default true;

-- Policies
alter table branches enable row level security;

create policy "Enable read access for authenticated users"
    on branches for select
    to authenticated
    using (true);

create policy "Enable insert/update for authenticated users"
    on branches for all
    to authenticated
    using (true)
    with check (true);
