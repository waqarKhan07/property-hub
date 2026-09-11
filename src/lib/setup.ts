import { config } from "@/config/config";

export function needsSetupBlock() {
  return !config.supabaseUrl || !config.supabaseAnonKey;
}