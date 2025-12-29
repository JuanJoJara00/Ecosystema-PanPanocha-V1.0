-- Migration: 20251229000004_update_auth_func.sql

-- Update get_auth_org_id to verify JWT Custom Claims first.
-- This allows "Headless" Devices with a signed token to bypass the 'profiles' lookup.

CREATE OR REPLACE FUNCTION get_auth_org_id()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
    jwt_claims jsonb;
BEGIN
    -- 1. Try to get from JWT claims (Performance & Device Support)
    -- current_setting('request.jwt.claims', true) returns the JSON payload
    BEGIN
        jwt_claims := current_setting('request.jwt.claims', true)::jsonb;
        
        -- Check if 'organization_id' exists in claims
        IF jwt_claims ? 'organization_id' THEN
            org_id := (jwt_claims ->> 'organization_id')::UUID;
            RETURN org_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Fallback if setting is missing or invalid
        NULL;
    END;

    -- 2. Fallback: Query profiles table (Legacy/Human Users)
    SELECT organization_id INTO org_id
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
