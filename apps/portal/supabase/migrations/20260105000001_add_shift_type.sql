-- ============================================
-- ADD SHIFT_TYPE ENUM AND COLUMN
-- ============================================
-- Purpose: Add shift_type enum to properly categorize shifts
-- Date: 2026-01-05

-- Create shift_type enum
CREATE TYPE shift_type AS ENUM ('mañana', 'tarde', 'turno_unico');

-- Add shift_type column to shifts table
ALTER TABLE shifts
ADD COLUMN shift_type shift_type;

-- Set default based on start_time (mirror POS logic)
-- Mañana: 6 AM - 2 PM
-- Tarde: 2 PM - 12 AM  
-- Turno Único: fallback

UPDATE shifts
SET shift_type = CASE
    WHEN EXTRACT(HOUR FROM start_time) < 14 THEN 'mañana'::shift_type
    WHEN EXTRACT(HOUR FROM start_time) >= 14 THEN 'tarde'::shift_type
    ELSE 'turno_unico'::shift_type
END
WHERE shift_type IS NULL;

-- Add comment
COMMENT ON COLUMN shifts.shift_type IS 'Tipo de turno: mañana (6AM-2PM), tarde (2PM-12AM), o turno_unico';
