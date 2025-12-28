-- Add payment tracking columns to purchase_orders
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
ADD COLUMN IF NOT EXISTS payment_proof_url text;

-- Create storage bucket for payment proofs (if not exists)
INSERT INTO storage.buckets (id, name, public) VALUES ('payment_proofs', 'payment_proofs', true) ON CONFLICT (id) DO NOTHING;

-- Policy for unauthenticated access to view invoices (optional)
CREATE POLICY "Public Access Proofs" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'payment_proofs' );

-- Policy for Authenticated upload
CREATE POLICY "Auth Upload Proofs" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'payment_proofs' AND auth.role() = 'authenticated' );

-- Policy for Authenticated update/delete
CREATE POLICY "Auth Update Proofs" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'payment_proofs' AND auth.role() = 'authenticated' );
