-- ============================================
-- MULTI-CHANNEL PRICING & CATALOGS
-- ============================================
-- Purpose: Support different prices per branch and sales channel
-- Date: 2026-01-13

-- 1. SALES CHANNELS
CREATE TABLE IF NOT EXISTS sales_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'retail' CHECK (type IN ('retail', 'delivery', 'wholesale', 'ecommerce')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- 2. PRODUCT PRICE OVERRIDES
CREATE TABLE IF NOT EXISTS product_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    channel_id UUID REFERENCES sales_channels(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    price DECIMAL(12,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Can have price per channel, per branch, or per both
    UNIQUE(organization_id, product_id, channel_id, branch_id)
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_product_prices_product ON product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_lookup ON product_prices(product_id, branch_id, channel_id);

-- 4. POWERSYNC PUBLICATION
-- Ensure these tables sync to the POS
ALTER PUBLICATION powersync ADD TABLE sales_channels;
ALTER PUBLICATION powersync ADD TABLE product_prices;

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_product_prices_product ON product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_lookup ON product_prices(product_id, branch_id, channel_id);

-- 7. INITIAL SEED (Default Channel)
-- Note: Replace with actual organization_id if needed, but usually handled by app logic
-- INSERT INTO sales_channels (name, type) VALUES ('Mostrador (POS)', 'retail'), ('Rappi', 'delivery');
