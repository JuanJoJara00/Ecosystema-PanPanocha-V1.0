-- Create Purchase Order Items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references purchase_orders(id) on delete cascade not null,
  item_id uuid references inventory_items(id) not null,
  quantity decimal(10,2) not null,
  unit_price decimal(10,2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated access
CREATE POLICY "Enable all access for authenticated users" ON purchase_order_items
FOR ALL USING (auth.role() = 'authenticated');

-- Allow authenticated access to purchase_orders (if not already fully enabled)
CREATE POLICY "Enable all access for authenticated users" ON purchase_orders
FOR ALL USING (auth.role() = 'authenticated');
