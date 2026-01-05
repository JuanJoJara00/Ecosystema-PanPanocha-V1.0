-- ============================================
-- GRANT ALL PERMISSIONS TO AUTHENTICATED USERS
-- ============================================
-- Purpose: Allow authenticated users to access all tables
-- Context: RLS policies will be added later for fine-grained access control
-- Date: 2026-01-05
-- Issue: Users were getting 403 Forbidden errors because authenticated role
--        had no base PostgreSQL GRANT permissions on tables

-- Grant full access on ALL existing tables in public schema
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant access on sequences (needed for auto-increment IDs)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant execute on all functions (for RPCs, triggers, etc.)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================
-- SET DEFAULT PRIVILEGES FOR FUTURE OBJECTS
-- ============================================
-- Any new table/sequence/function will automatically get these permissions

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT ALL ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT ALL ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT EXECUTE ON FUNCTIONS TO authenticated;

-- ============================================
-- NOTE: RLS POLICIES TO BE ADDED LATER
-- ============================================
-- TODO: Add organization-level isolation policies
-- TODO: Add branch-level access control policies  
-- TODO: Add role-based permission policies (owner/manager/employee)
