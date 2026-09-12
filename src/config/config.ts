function envString(value: string | undefined): string | undefined {
  return value && value.trim() ? value : undefined;
}

function httpUrl(value: string | undefined): string | undefined {
  const trimmed = envString(value);
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

export const config = {
  supabaseUrl: httpUrl(import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: envString(import.meta.env.VITE_SUPABASE_ANON_KEY),
  appName: "RentHub",
  appTagline: "Find a place you'll love.",
  appUrl: import.meta.env.VITE_APP_URL || "http://localhost:5173",
};

export const isBackendConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);