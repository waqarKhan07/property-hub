import { createClient } from "@supabase/supabase-js";
import { config, isBackendConfigured } from "@/config/config";

const url = config.supabaseUrl ?? "https://placeholder.supabase.co";
const key = config.supabaseAnonKey ?? "placeholder-anon-key";

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export function requiresBackend() {
  if (!isBackendConfigured) {
    throw new Error(
      "RentHub is not connected yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file. See README for setup.",
    );
  }
  return true;
}