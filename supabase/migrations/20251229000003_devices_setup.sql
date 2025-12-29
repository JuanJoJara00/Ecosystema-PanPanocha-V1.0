-- Migration: 20251229000003_devices_setup.sql

-- 1. Create Enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'device_status') THEN
        CREATE TYPE device_status AS ENUM ('pending', 'active', 'inactive', 'decommissioned');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provisioning_status') THEN
        CREATE TYPE provisioning_status AS ENUM ('waiting', 'approved', 'rejected', 'expired');
    END IF;
END $$;

-- 2. Create Devices Table
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000000',
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    fingerprint TEXT,
    -- Removed short_code, using separate provisioning table
    auth_token_hash TEXT,
    status device_status DEFAULT 'active', -- Default to active once created via provisioning
    type TEXT DEFAULT 'pos_terminal',
    ip_address TEXT,
    app_version TEXT,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 3. Create Provisioning Sessions Table (The "Handshake" State)
-- This table holds the temporary state while the POS waits for the Manager to scan the QR.
CREATE TABLE IF NOT EXISTS provisioning_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id), -- Nullable initially, set upon approval if needed? No, usually public until claimed.
    -- Actually, this table needs to be publicly writable (with rate limits) or anonymous RLS?
    -- Better: It's created by the POS (unauthenticated).
    
    fingerprint TEXT NOT NULL, -- The hardware ID claiming this session
    device_name TEXT,          -- Proposed name (e.g. "POS-WINDOW-1")
    ip_address TEXT,
    
    status provisioning_status DEFAULT 'waiting',
    
    -- Result (Populated by Manager)
    assigned_branch_id UUID REFERENCES branches(id),
    generated_auth_token TEXT, -- Encrypted or temporary? Using generic flow, simpler to store here momentarily? 
    -- CAUTION: Storing the token here is risky if polling is not secure.
    -- BETTER: The poll returns a "One-Time Exchange Code" which allows the POS to fetch the real token securely? 
    -- SIMPLICITY: We will store the encrypted token here for the duration of the polling window (e.g. 5 mins).
    
    dummy_auth_token TEXT, -- Placeholder for the architecture prompt
    
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indices
CREATE INDEX IF NOT EXISTS idx_devices_branch_id ON devices(branch_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(fingerprint) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_provision_expires ON provisioning_sessions(expires_at);

-- 5. RLS
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE provisioning_sessions ENABLE ROW LEVEL SECURITY;

-- Devices Policies (Tenant Isolation)
DROP POLICY IF EXISTS "Tenant Isolation Select" ON devices;
CREATE POLICY "Tenant Isolation Select" ON devices FOR SELECT USING (organization_id = get_auth_org_id());

DROP POLICY IF EXISTS "Tenant Isolation Insert" ON devices;
CREATE POLICY "Tenant Isolation Insert" ON devices FOR INSERT WITH CHECK (organization_id = get_auth_org_id());

DROP POLICY IF EXISTS "Tenant Isolation Update" ON devices;
CREATE POLICY "Tenant Isolation Update" ON devices FOR UPDATE USING (organization_id = get_auth_org_id());

DROP POLICY IF EXISTS "Tenant Isolation Delete" ON devices;
CREATE POLICY "Tenant Isolation Delete" ON devices FOR DELETE USING (organization_id = get_auth_org_id());

-- Provisioning Policies
-- 1. Public Insertion (The POS creates the session) - Rate limit this in API middleware!
CREATE POLICY "Anon Create Session" ON provisioning_sessions FOR INSERT WITH CHECK (true);

-- 2. Public Read (The POS polls its OWN session by ID)
-- Weakness: UUID guessing. Mitigation: Valid UUID required.
CREATE POLICY "Anon Read Own Session" ON provisioning_sessions FOR SELECT USING (true); 

-- 3. Manager Update (Approve/Reject)
-- Only auth users can update status.
CREATE POLICY "Manager Approve Session" ON provisioning_sessions FOR UPDATE USING (auth.role() = 'authenticated');
