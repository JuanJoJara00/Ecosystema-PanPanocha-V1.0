import { createClient } from '@supabase/supabase-js';

// Access vars from .env (Vite uses import.meta.env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase credentials missing!");
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
