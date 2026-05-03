import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function getSupabaseConfigError() {
  if (isSupabaseConfigured) {
    return null;
  }

  return "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env before using authentication.";
}
