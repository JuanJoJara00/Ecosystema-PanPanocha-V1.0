create table if not exists provisioning_sessions (
  id uuid default gen_random_uuid() primary key,
  fingerprint text not null,
  device_name text,
  device_type text default 'pos',
  ip_address text,
  status text default 'pending',
  auth_token text,
  organization_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  expires_at timestamptz
);

-- Add index for faster lookups if needed
create index if not exists idx_provisioning_sessions_fingerprint on provisioning_sessions(fingerprint);
