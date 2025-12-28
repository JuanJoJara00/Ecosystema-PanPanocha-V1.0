-- Enable insert/update for authenticated users on Inventory Items
CREATE POLICY "Enable all access for authenticated users" ON inventory_items
FOR ALL USING (auth.role() = 'authenticated');

-- Enable insert/update for authenticated users on Suppliers
CREATE POLICY "Enable all access for authenticated users" ON suppliers
FOR ALL USING (auth.role() = 'authenticated');

-- Enable insert/update for Branch Inventory
CREATE POLICY "Enable all access for authenticated users" ON branch_inventory
FOR ALL USING (auth.role() = 'authenticated');
