-- Enable publication for PowerSync
DROP PUBLICATION IF EXISTS powersync;
CREATE PUBLICATION powersync FOR TABLE 
  products, 
  users, 
  branches, 
  shifts, 
  tables, 
  orders, 
  order_items, 
  transaction_events, 
  clients, 
  expenses, 
  stock_reservations, 
  rappi_deliveries, 
  deliveries, 
  tip_distributions;

-- Note: Ensure 'wal_level' is set to 'logical' in Postgres config (Default in Supabase)
