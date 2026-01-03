-- Migration: Add Provisioning Sessions (Hardened)
-- Date: 2025-01-03

create table if not exists provisioning_sessions (
  id uuid default gen_random_uuid() primary key,
  fingerprint text not null,
  device_name text,
  device_type text default 'pos',
  ip_address text,
  status text default 'pending',
  auth_token_hash text, -- Replaced plain auth_token with hash
  organization_id uuid references organizations(id), -- Added FK constraint
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  expires_at timestamptz
);

-- Add index for faster lookups
create index if not exists idx_provisioning_sessions_fingerprint on provisioning_sessions(fingerprint);
create index if not exists idx_provisioning_sessions_org_id on provisioning_sessions(organization_id);

-- 1. Enable RLS
ALTER TABLE provisioning_sessions ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policy: Tenant Isolation
-- Only allow access if organization_id matches user's organization (via metadata or custom claim)
-- Assuming 'app_metadata' or a 'get_user_org_id()' helper exists or using profile lookup
CREATE POLICY "Tenant Isolation" ON provisioning_sessions
    USING (
        organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        OR 
        auth.role() = 'service_role' -- Allow service role full access
    )
    WITH CHECK (
        organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        OR 
        auth.role() = 'service_role'
    );

-- 3. Automatic updated_at Trigger
CREATE OR REPLACE FUNCTION update_provisioning_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_provisioning_updated_at ON provisioning_sessions;
CREATE TRIGGER trg_provisioning_updated_at
BEFORE UPDATE ON provisioning_sessions
FOR EACH ROW
EXECUTE FUNCTION update_provisioning_updated_at();
