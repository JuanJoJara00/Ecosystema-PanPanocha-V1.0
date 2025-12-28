CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID references branches(id),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'pending_approval', -- pending, active, revoked
    public_key TEXT, -- For future encryption if needed
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- RLS Policy for devices
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (Admins) to manage devices
CREATE POLICY "Admins can manage devices" ON devices
    FOR ALL
    USING (auth.role() = 'authenticated');
