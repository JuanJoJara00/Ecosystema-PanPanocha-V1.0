-- Migration: Branch Channels Configuration & Product Costs
-- Description: Enables configuring channels per branch and tracks product costs for net profit calculation.

-- 1. Create branch_channels table
CREATE TABLE IF NOT EXISTS public.branch_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
    channel_id UUID REFERENCES public.sales_channels(id) ON DELETE CASCADE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Costs Configuration
    commission_percentage DECIMAL(5,2) DEFAULT 0, -- e.g., 20.00 for 20% commission (Variable Cost)
    monthly_operating_cost DECIMAL(12,2) DEFAULT 0, -- Allocated fixed costs (Rent, Payroll, etc.) per month for this channel
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(branch_id, channel_id)
);

-- 2. Add 'cost' to products table for COGS calculation
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN public.products.cost IS 'Estimated unit cost for COGS calculation';

-- 3. Enable RLS
ALTER TABLE public.branch_channels ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Users can view branch_channels" ON public.branch_channels FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can manage branch_channels" ON public.branch_channels FOR ALL USING (auth.role() = 'authenticated');

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_branch_channels_lookup ON public.branch_channels(branch_id, channel_id);
