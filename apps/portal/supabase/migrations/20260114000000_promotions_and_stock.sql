-- Add Stock Tracking to Branch Products (REMOVED - Using Ingredient Derivation)
-- ALTER TABLE branch_products 
-- ADD COLUMN IF NOT EXISTS current_stock INTEGER DEFAULT 0,
-- ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT FALSE;

-- Promotions Table
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'combo', 'bogo')),
    value DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Scope (JSON arrays of UUIDs, empty/null means Global)
    scope_channels JSONB DEFAULT '[]'::jsonb, 
    scope_branches JSONB DEFAULT '[]'::jsonb,
    
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0, -- Higher priority applied first

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Targets (Which products does this apply to?)
CREATE TABLE IF NOT EXISTS promotion_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('product', 'category', 'all')),
    target_id UUID, -- ProductID or CategoryID (Null if 'all')
    
    -- For combos: specific requirement (e.g. Buy 1 of THIS target)
    quantity_required INTEGER DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
-- RLS Policies (Temporarily Removed)
-- ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE promotion_targets ENABLE ROW LEVEL SECURITY;
