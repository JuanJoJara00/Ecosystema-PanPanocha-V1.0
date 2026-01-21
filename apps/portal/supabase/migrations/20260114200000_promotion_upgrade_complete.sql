-- Migration: Upgrade Promotions Schema v2.0
-- Description: Ensures the 'promotions' table has all necessary columns for the new 'Performance Modal' and 'Security' features.
-- Also incorporates recently added tables/columns to ensure full compatibility.

-- 1. Ensure 'promotions' table has all advanced columns
DO $$
BEGIN
    -- 'config' column for flexible metadata (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promotions' AND column_name = 'config') THEN
        ALTER TABLE public.promotions ADD COLUMN config jsonb DEFAULT '{}'::jsonb;
    END IF;

    -- 'scope_channels' column for multi-channel targeting
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promotions' AND column_name = 'scope_channels') THEN
        ALTER TABLE public.promotions ADD COLUMN scope_channels jsonb DEFAULT '[]'::jsonb;
    END IF;

    -- 'scope_branches' column for location-specific targeting
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promotions' AND column_name = 'scope_branches') THEN
        ALTER TABLE public.promotions ADD COLUMN scope_branches jsonb DEFAULT '[]'::jsonb;
    END IF;

    -- 'priority' for conflict resolution
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promotions' AND column_name = 'priority') THEN
        ALTER TABLE public.promotions ADD COLUMN priority integer DEFAULT 0;
    END IF;
END $$;

-- 2. Ensure 'product_prices' table exists (Multi-Channel Pricing)
-- This replaces the need for some logic in 'branch_products' for price overrides.
CREATE TABLE IF NOT EXISTS public.product_prices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL,
  product_id uuid NOT NULL,
  channel_id uuid,          -- NULL means 'Base Price' or specific channel override
  branch_id uuid,           -- NULL means 'Global' or specific branch override
  price numeric NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_prices_pkey PRIMARY KEY (id),
  CONSTRAINT product_prices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT product_prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT product_prices_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.sales_channels(id),
  CONSTRAINT product_prices_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  -- Ensure unique price definition for a specific scope
  CONSTRAINT product_prices_unique_scope UNIQUE NULLS NOT DISTINCT (organization_id, product_id, channel_id, branch_id)
);

-- 3. Ensure 'ignore_promotions' on products
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'ignore_promotions') THEN
        ALTER TABLE public.products ADD COLUMN ignore_promotions boolean DEFAULT false;
    END IF;
END $$;

-- 4. Security: Verify verify_action_pin RPC exists
-- (Already addressed in previous migration, but included for completeness if re-running)
CREATE OR REPLACE FUNCTION verify_action_pin(input_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  valid_user boolean;
BEGIN
  -- Roles allowed: 'owner', 'admin', 'dev'
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE pin_code = input_pin 
    AND role IN ('owner', 'admin', 'dev') 
    AND (active = TRUE)
  ) INTO valid_user;

  RETURN valid_user;
END;
$$;
