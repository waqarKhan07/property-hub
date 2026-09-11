import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  Eye,
  Heart,
  Home,
  MessageCircle,
  PlusCircle,
  TrendingUp,
} from "lucide-react";
import { formatDateTime, cn } from "@/lib/utils";
import { visitStatusLabels } from "@/lib/constants";
import type { VisitStatus } from "@/types";

interface Stats {
  activeListings: number;
  totalViews: number;
  totalSaved: number;
  pendingVisits: number;
  confirmedVisits: number;
  conversations: number;
  draftCount: number;
}

const statusTone: Record<VisitStatus, "gray" | "blue" | "green" | "amber" | "red"> = {
  pending: "amber",
  confirmed: "green",
  reschedule_requested: "blue",
  completed: "gray",
  cancelled: "red",
  declined: "red",
};

interface VisitRow {
  id: string;
  visit_date: string;
  visit_time: string;
  status: VisitStatus;
  requester: { full_name: string | null } | null;
  property: { title: string } | null;
}

export default function OwnerDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [visits, setVisits] = useState<Array<{ id: string; visit_date: string; visit_time: string; status: VisitStatus; requester: { full_name: string | null } | null; property: { title: string } | null }>>([]);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [propsRes, convRes, visitRes] = await Promise.all([
      supabase.from("properties").select("status, views_count, favorites_count").eq("owner_id", user.id),
      supabase.from("conversations").select("id", { count: "exact" }).or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`),
      supabase
        .from("visit_requests")
        .select("id, visit_date, visit_time, status, requester:requester_id(full_name), property:property_id(title)")
        .in("property.owner_id", [user.id])
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (propsRes.error || visitRes.error) {
      setError(true);
      return;
    }

    const list = propsRes.data ?? [];
    setStats({
      activeListings: list.filter((p) => p.status === "active").length,
      draftCount: list.filter((p) => p.status === "draft").length,
      totalViews: list.reduce((s, p) => s + (p.views_count ?? 0), 0),
      totalSaved: list.reduce((s, p) => s + (p.favorites_count ?? 0), 0),
      pendingVisits: (visitRes.data ?? []).filter((v) => v.status === "pending").length,
      confirmedVisits: (visitRes.data ?? []).filter((v) => v.status === "confirmed").length,
      conversations: convRes.count ?? 0,
    });
    setVisits((visitRes.data as unknown as VisitRow[]) ?? []);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const tiles = [
    { label: "Active listings", value: stats?.activeListings, icon: Home, tone: "text-brand-600 bg-brand-50" },
    { label: "Drafts", value: stats?.draftCount, icon: TrendingUp, tone: "text-ink-500 bg-ink-100" },
    { label: "Total views", value: stats?.totalViews, icon: Eye, tone: "text-sky-600 bg-sky-50" },
    { label: "Saves / favourites", value: stats?.totalSaved, icon: Heart, tone: "text-red-500 bg-red-50" },
    { label: "Pending visits", value: stats?.pendingVisits, icon: CalendarClock, tone: "text-amber-600 bg-amber-50" },
    { label: "Confirmed visits", value: stats?.confirmedVisits, icon: CalendarClock, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Conversations", value: stats?.conversations, icon: MessageCircle, tone: "text-purple-600 bg-purple-50" },
  ];

  return (
    <div className="container-app py-8">
      <div className="mb-6 grid gap-3 lg:grid-cols-[240px_1fr] lg:gap-6">
        <aside className="rounded-2xl border border-ink-200 bg-white p-4">
          <DashboardNav active="/dashboard" />
        </aside>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-ink-900">Owner dashboard</h1>
              <p className="mt-1 text-sm text-ink-500">Your properties and leads at a glance.</p>
            </div>
            <Link to="/dashboard/properties/new">
              <Button>
                <PlusCircle className="h-4 w-4" />
                Add property
              </Button>
            </Link>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-ink-200 bg-white p-10 text-center text-sm text-ink-500">
              We couldn&apos;t load your dashboard. Please refresh and try again.
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {tiles.map((t) => (
              <Card key={t.label} className="p-4">
                <div className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-lg", t.tone)}>
                  <t.icon className="h-4.5 w-4.5" />
                </div>
                <p className="text-2xl font-bold text-ink-900">{t.value ?? "—"}</p>
                <p className="mt-0.5 text-xs text-ink-500">{t.label}</p>
              </Card>
            ))}
          </div>

          {/* Recent visit requests */}
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink-900">Recent visit requests</h2>
              <Link to="/dashboard/visits" className="text-sm font-medium text-brand-600 hover:underline">
                View all
              </Link>
            </div>
            {visits.length === 0 ? (
              <Card className="p-8 text-center text-sm text-ink-500">
                No visit requests yet. They&apos;ll appear here when tenants ask to see your properties.
              </Card>
            ) : (
              <div className="space-y-2">
                {visits.map((v) => (
                  <Card key={v.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-ink-900">{v.property?.title ?? "Property"}</p>
                      <p className="text-sm text-ink-500">
                        {formatDateTime(`${v.visit_date}T${v.visit_time}`)} · {v.requester?.full_name ?? "A tenant"}
                      </p>
                    </div>
                    <Badge tone={statusTone[v.status]}>{visitStatusLabels[v.status]}</Badge>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}