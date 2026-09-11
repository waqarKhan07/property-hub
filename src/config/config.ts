export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  appName: "RentHub",
  appTagline: "Find a place you'll love.",
  appUrl: import.meta.env.VITE_APP_URL ?? "http://localhost:5173",
};

export const isBackendConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);