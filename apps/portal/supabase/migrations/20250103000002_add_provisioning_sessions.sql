-- Migration: Add Provisioning Sessions (Final Fix)
-- Date: 2025-01-03

-- Ensure organizations exists
create table if not exists organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);

-- Note: User specified "profiles is the same as table users" and "not using RLS policies yet".
-- So we skip creating 'profiles' table and complex RLS policies here.

-- Create provisioning_sessions
create table if not exists provisioning_sessions (
  id uuid default gen_random_uuid() primary key,
  fingerprint text not null,
  device_name text,
  device_type text default 'pos',
  ip_address text,
  status text default 'pending',
  auth_token_hash text, -- Replaced plain auth_token with hash
  organization_id uuid references organizations(id), -- FK to organizations
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  expires_at timestamptz
);

-- Add index for faster lookups
create index if not exists idx_provisioning_sessions_fingerprint on provisioning_sessions(fingerprint);
create index if not exists idx_provisioning_sessions_org_id on provisioning_sessions(organization_id);

-- Disable RLS explicitly to avoid "permission denied" from policy checks
ALTER TABLE provisioning_sessions DISABLE ROW LEVEL SECURITY;

-- EXPLICIT GRANTS to ensure service_role and others can access the table
-- This fixes "permission denied" errors when RLS is disabled but ownership/grant is missing
GRANT ALL ON TABLE provisioning_sessions TO service_role;
GRANT ALL ON TABLE provisioning_sessions TO postgres;
GRANT ALL ON TABLE provisioning_sessions TO anon;
GRANT ALL ON TABLE provisioning_sessions TO authenticated;

-- Automatic updated_at Trigger
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