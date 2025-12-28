-- Ensure image_url column exists
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Just in case, ensure other columns are there too
ALTER TABLE products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

-- Notify Supabase to refresh schema cache (usually automatic but good to run a DDL)
COMMENT ON TABLE products IS 'Product catalog table';
