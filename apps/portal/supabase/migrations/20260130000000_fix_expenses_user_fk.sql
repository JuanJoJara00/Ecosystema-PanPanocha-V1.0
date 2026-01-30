
-- Migration: Fix expenses user_id foreign key to point to public.users
-- Description: The original table referenced auth.users which prevents frontend joins via PostgREST.
--             This migration repoints the FK to public.users.

DO $$
BEGIN
    -- Drop the old constraint if it exists (referencing auth.users)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'expenses_user_id_fkey' 
        AND table_name = 'expenses'
    ) THEN
        ALTER TABLE expenses DROP CONSTRAINT expenses_user_id_fkey;
    END IF;

    -- Add the new constraint referencing public.users
    -- Check if user_id column exists, if not add it (just in case)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE expenses ADD COLUMN user_id uuid REFERENCES public.users(id);
    ELSE
        -- Add constraint
        ALTER TABLE expenses 
        ADD CONSTRAINT expenses_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES public.users(id);
    END IF;

END $$;
