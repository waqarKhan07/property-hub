import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { SetupNotice } from "@/components/SetupNotice";
import { BackendOfflineCard } from "@/components/auth/BackendOfflineCard";
import { useBackendStatus } from "@/lib/backend";

export function BackendGate({ children }: { children: ReactNode }) {
  const { status } = useBackendStatus();

  if (status === "missing") return <SetupNotice />;
  if (status === "checking") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white py-8 text-sm text-ink-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Checking connection…
      </div>
    );
  }
  if (status === "invalid" || status === "unreachable") return <BackendOfflineCard />;

  return <>{children}</>;
}