-- Add closing_metadata column to shifts table for Siigo attachments
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS closing_metadata JSONB;

-- Comment
COMMENT ON COLUMN public.shifts.closing_metadata IS 'JSON containing generic closing data including Siigo/Dataphone attachment URLs';
