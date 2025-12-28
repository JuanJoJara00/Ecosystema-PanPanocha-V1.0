-- Add invoice_url to purchase_orders
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS invoice_url text;

-- Create storage bucket for invoices (if not exists)
-- Note: Doing this via SQL is Supabase specific
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', true) ON CONFLICT (id) DO NOTHING;

-- Policy for unauthenticated access to view invoices (optional, but good for potential public view or just ease inside app)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'invoices' );

-- Policy for Authenticated upload
CREATE POLICY "Auth Upload" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'invoices' AND auth.role() = 'authenticated' );

-- Policy for Authenticated update/delete
CREATE POLICY "Auth Update" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'invoices' AND auth.role() = 'authenticated' );
