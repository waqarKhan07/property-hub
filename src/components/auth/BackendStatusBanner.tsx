import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Database, KeyRound, RefreshCw, WifiOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBackendStatus, type BackendStatus } from "@/lib/backend";
import { Button } from "@/components/ui/Button";

const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];
const DISMISS_KEY = "renthub:backend-banner-dismissed";

const CONTENT: Record<
  string,
  { icon: typeof Database; tone: string; iconTone: string; title: string; body: string }
> = {
  missing: {
    icon: Database,
    tone: "border-amber-200 bg-amber-50 text-amber-900",
    iconTone: "text-amber-600",
    title: "RentHub isn't connected to a database yet.",
    body: "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file, then restart the dev server to unlock sign-in, sign-up and listings.",
  },
  invalid: {
    icon: KeyRound,
    tone: "border-red-200 bg-red-50 text-red-900",
    iconTone: "text-red-600",
    title: "Database connection was rejected.",
    body: "The API key in your .env isn't valid for this Supabase project, so sign-in, sign-up and listings are temporarily unavailable. Use the real anon (public) key from your Supabase dashboard and restart the dev server.",
  },
  unreachable: {
    icon: WifiOff,
    tone: "border-amber-200 bg-amber-50 text-amber-900",
    iconTone: "text-amber-600",
    title: "Can't reach the database right now.",
    body: "Check your internet connection and try again — listings and sign-in will come back once RentHub can reach its database.",
  },
};

function BannerInner({ status, recheck }: { status: Exclude<BackendStatus, "checking">; recheck: () => void }) {
  const content = CONTENT[status];
  const Icon = content.icon;
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");

  if (dismissed) return null;

  return (
    <div role="status" className={cn("border-b px-4 py-2.5 text-sm", content.tone)}>
      <div className="container-app flex items-start gap-2.5">
        <Icon className={cn("mt-px h-4 w-4 shrink-0", content.iconTone)} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{content.title}</p>
          <p className="mt-0.5 leading-snug text-inherit opacity-90">{content.body}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-current/40 bg-transparent"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, "0");
              recheck();
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, "1");
              setDismissed(true);
            }}
            aria-label="Dismiss notice"
            className="rounded-lg p-1.5 opacity-70 transition hover:bg-black/5 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function BackendStatusBanner() {
  const { status, recheck } = useBackendStatus();
  const { pathname } = useLocation();

  if (status === "ok" || status === "checking") return null;
  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) return null;

  return <BannerInner status={status} recheck={recheck} />;
}