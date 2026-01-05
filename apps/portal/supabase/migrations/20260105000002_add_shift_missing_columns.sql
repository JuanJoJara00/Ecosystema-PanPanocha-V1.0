-- ============================================
-- ADD MISSING COLUMNS TO SHIFTS TABLE
-- ============================================
-- Purpose: Add columns required by Portal for closing metadata and sync status
-- Date: 2026-01-05

-- Add closing_metadata column (JSONB) to store PanPanocha and Siigo closing data
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS closing_metadata JSONB;

-- Add updated_at timestamp
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add synced boolean for offline sync tracking
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT false;

-- Add observations text field for notes
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS observations TEXT;

-- Add comments
COMMENT ON COLUMN shifts.closing_metadata IS 'Stores PanPanocha and Siigo closing details as JSON: {panpanocha: {...}, siigo: {...}}';
COMMENT ON COLUMN shifts.updated_at IS 'Last modification timestamp';
COMMENT ON COLUMN shifts.synced IS 'Whether shift has been synced from POS to Portal';
COMMENT ON COLUMN shifts.observations IS 'Additional notes about the shift/closing';

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_shifts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shifts_updated_at_trigger ON shifts;
CREATE TRIGGER shifts_updated_at_trigger
    BEFORE UPDATE ON shifts
    FOR EACH ROW
    EXECUTE FUNCTION update_shifts_updated_at();
