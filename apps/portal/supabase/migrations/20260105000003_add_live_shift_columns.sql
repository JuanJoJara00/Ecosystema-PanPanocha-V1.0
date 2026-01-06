-- Add columns for Live Shift Monitoring
ALTER TABLE public.shifts 
ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS closed_by_method text CHECK (closed_by_method IN ('pos', 'remote'));

COMMENT ON COLUMN public.shifts.last_seen_at IS 'Timestamp of the last heartbeat from the POS device';
COMMENT ON COLUMN public.shifts.closed_by_method IS 'Indicates if the shift was closed locally by the POS or remotely by an admin';
