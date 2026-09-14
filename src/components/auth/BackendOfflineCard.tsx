import { KeyRound, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBackendStatus } from "@/lib/backend";
import { Button } from "@/components/ui/Button";

export function BackendOfflineCard() {
  const { status, recheck } = useBackendStatus();
  const invalid = status === "invalid";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-sm",
        invalid ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900",
      )}
    >
      <KeyRound className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="grid gap-2">
        <p className="font-semibold">
          {invalid ? "Database connection needs attention." : "Database isn't reachable right now."}
        </p>
        <p>
          {invalid
            ? "The API key in your .env file isn't accepted by this Supabase project, so sign-in is temporarily unavailable. Replace VITE_SUPABASE_ANON_KEY with the real anon (public) key from your Supabase dashboard, restart the dev server, then try again."
            : "RentHub couldn't reach its database, so sign-in is temporarily unavailable. Check your connection and try again."}
        </p>
        <Button size="sm" variant="outline" className="justify-self-start" onClick={recheck}>
          <RefreshCw className="h-3.5 w-3.5" />
          Re-check connection
        </Button>
      </div>
    </div>
  );
}