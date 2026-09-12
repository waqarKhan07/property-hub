import { useCallback, useEffect, useState } from "react";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { timeAgo, cn } from "@/lib/utils";
import type { AppNotification } from "@/types";

export default function NotificationsPage() {
  useDocumentTitle("Notifications — RentHub");
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error: err } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(0, 49);
    if (err) {
      setError(true);
      return;
    }
    setItems((data as AppNotification[]) ?? []);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  // Live updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const unreadCount = items?.filter((n) => !n.read_at).length ?? 0;

  async function markAllRead() {
    if (!user) return;
    setItems((prev) => prev?.map((n) => ({ ...n, read_at: new Date().toISOString() })) ?? null);
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
  }

  return (
    <div className="container-app py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Notifications</h1>
          <p className="mt-1 text-sm text-ink-500">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => void markAllRead()}>
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="mt-6">
        {error && (
          <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center text-sm text-ink-500">
            We couldn&apos;t load notifications. Please try again.
          </div>
        )}
        {!error && items === null &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="mb-3 h-16 w-full rounded-xl" />)
        }
        {!error && items !== null && items.length === 0 && (
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="You'll be notified about messages, visit requests and listing updates here."
          />
        )}
        {items?.map((n) => (
          <div
            key={n.id}
            className={cn(
              "mb-2 flex items-start gap-3 rounded-xl border border-ink-200 bg-white p-4",
              !n.read_at && "border-l-4 border-l-brand-500",
            )}
          >
            <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", n.read_at ? "bg-ink-100 text-ink-500" : "bg-brand-50 text-brand-600")}>
              <BellRing className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-ink-900">{n.title}</p>
                <span className="shrink-0 text-xs text-ink-400">{timeAgo(n.created_at)}</span>
              </div>
              {n.body && <p className="mt-0.5 text-sm text-ink-600">{n.body}</p>}
              {!n.read_at && (
                <button
                  type="button"
                  className="mt-1.5 text-xs font-medium text-brand-600 hover:underline"
                  onClick={async () => {
                    setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)) ?? null);
                    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
                  }}
                >
                  Mark as read
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}