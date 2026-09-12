function envString(value: string | undefined): string | undefined {
  return value && value.trim() ? value : undefined;
}

export const config = {
  supabaseUrl: envString(import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: envString(import.meta.env.VITE_SUPABASE_ANON_KEY),
  appName: "RentHub",
  appTagline: "Find a place you'll love.",
  appUrl: import.meta.env.VITE_APP_URL || "http://localhost:5173",
};

export const isBackendConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);