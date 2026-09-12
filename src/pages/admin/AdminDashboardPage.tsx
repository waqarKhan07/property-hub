import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flag, Home, ShieldCheck, UserRound, Users, CalendarClock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

interface AdminStats {
  totalUsers: number;
  owners: number;
  activeListings: number;
  pendingVerification: number;
  openReports: number;
  pendingVisits: number;
}

export default function AdminDashboardPage() {
  useDocumentTitle("Admin overview — RentHub");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reports, setReports] = useState<Array<{ id: string; target_type: string; reason: string; status: string; created_at: string }>>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [profiles, props, verif, rep, visits] = await Promise.all([
        supabase.from("profiles").select("id, role", { count: "exact" }),
        supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("verification_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase
          .from("reports")
          .select("id, target_type, reason, status, created_at")
          .in("status", ["open", "under_review"])
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("visit_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      if (active) {
        if (profiles.error || props.error || verif.error || rep.error || visits.error) {
          setError(true);
          return;
        }
        const all = profiles.data ?? [];
        setStats({
          totalUsers: profiles.count ?? 0,
          owners: all.filter((p) => (p as { role?: string }).role === "owner" || (p as { role?: string }).role === "admin").length,
          activeListings: props.count ?? 0,
          pendingVerification: verif.count ?? 0,
          openReports: rep.data?.length ?? 0,
          pendingVisits: visits.count ?? 0,
        });
        setReports(rep.data ?? []);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const tiles = [
    { label: "Total users", value: stats?.totalUsers, icon: Users, tone: "text-brand-600 bg-brand-50" },
    { label: "Owners & agents", value: stats?.owners, icon: UserRound, tone: "text-sky-600 bg-sky-50" },
    { label: "Active listings", value: stats?.activeListings, icon: Home, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Pending verification", value: stats?.pendingVerification, icon: ShieldCheck, tone: "text-amber-600 bg-amber-50" },
    { label: "Open reports", value: stats?.openReports, icon: Flag, tone: "text-red-600 bg-red-50" },
    { label: "Pending visits", value: stats?.pendingVisits, icon: CalendarClock, tone: "text-purple-600 bg-purple-50" },
  ];

  return (
    <div className="container-app py-8">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Admin overview</h1>
        <p className="mt-1 text-sm text-ink-500">Live marketplace statistics. Manage users, listings and reports in the next panel.</p>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-ink-200 bg-white p-10 text-center text-sm text-ink-500">
          We couldn&apos;t load analytics. Please try again.
        </div>
      )}

      {!error && !stats && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      )}

      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {tiles.map((t) => (
            <Card key={t.label} className="p-4">
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${t.tone}`}>
                <t.icon className="h-4.5 w-4.5" />
              </div>
              <p className="text-2xl font-bold text-ink-900">{t.value?.toLocaleString("en-PK") ?? "—"}</p>
              <p className="mt-0.5 text-xs text-ink-500">{t.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Recent reports */}
      <div className="mt-8 max-w-2xl">
        <h2 className="text-lg font-bold text-ink-900">Reports to review</h2>
        {!error && stats && reports.length === 0 && (
          <Card className="mt-3 p-8 text-center text-sm text-ink-500">
            Nothing flagged right now — the queue is clear.
          </Card>
        )}
        <div className="mt-3 space-y-2">
          {reports.map((r) => (
            <Card key={r.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge tone="red">{r.target_type}</Badge>
                  <span className="truncate text-sm font-medium text-ink-900">{r.reason}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-ink-400">
                  <span>{formatDateTime(r.created_at)}</span>
                  <Badge tone={r.status === "open" ? "amber" : "blue"}>{r.status}</Badge>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-300" />
            </Card>
          ))}
        </div>
        <p className="mt-4 text-sm text-ink-500">
          Full moderation tools (user management, listing review, report resolution) land in the next
          build phase.{" "}
          <Link to="/dashboard" className="font-medium text-brand-600 hover:underline">
            Back to owner dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}