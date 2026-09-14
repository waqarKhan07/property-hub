import type { AuthError } from "@supabase/supabase-js";

export const BACKEND_UNAVAILABLE =
  "RentHub's database connection isn't valid right now — the API key in your .env file isn't accepted by this Supabase project. " +
  "Replace VITE_SUPABASE_ANON_KEY with the real anon (public) key from your Supabase dashboard, restart the dev server, then try again.";

const CODE_MESSAGES: Record<string, string> = {
  invalid_credentials: "Incorrect email or password.",
  email_not_confirmed: "Please confirm your email first — check your inbox for the activation link.",
  user_already_exists: "That email is already registered. Try signing in instead.",
  over_email_send_rate_limit: "We've sent too many emails recently. Please wait a moment and try again.",
  over_request_rate_limit: "Too many attempts — please wait a moment and try again.",
  session_expired: "This session has expired. Please sign in again.",
  otp_expired: "That code has expired. Please request a new one.",
};

export function describeAuthError(error: AuthError | null, fallback: string): string {
  if (!error) return fallback;
  const message = error.message ?? "";
  const lower = message.toLowerCase();

  if (error.status === 401 || lower.includes("invalid api key") || lower.includes("invalid jwt") || lower.includes("api key")) {
    return BACKEND_UNAVAILABLE;
  }
  if (error.code && CODE_MESSAGES[error.code]) {
    return CODE_MESSAGES[error.code];
  }
  if (error.code === "weak_password") {
    return message || fallback;
  }
  return fallback;
}