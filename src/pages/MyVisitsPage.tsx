import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/utils";
import { visitStatusLabels } from "@/lib/constants";
import type { VisitRequestWithDetails, VisitStatus } from "@/types";

const statusTone: Record<VisitStatus, "gray" | "blue" | "green" | "amber" | "red"> = {
  pending: "amber",
  confirmed: "green",
  reschedule_requested: "blue",
  completed: "gray",
  cancelled: "red",
  declined: "red",
};

export default function MyVisitsPage() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<VisitRequestWithDetails[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase
      .from("visit_requests")
      .select("*, property:property_id(*, owner:owner_id(id, full_name, avatar_url, verification_status)), requester:requester_id(id, full_name, avatar_url, verification_status)")
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err) {
          setError(true);
          return;
        }
        setVisits((data as VisitRequestWithDetails[]) ?? []);
      });
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <div className="container-app py-8">
      <h1 className="text-2xl font-bold text-ink-900">My visits</h1>
      <p className="mt-1 text-sm text-ink-500">Track your requested property visits here.</p>

      <div className="mt-6 space-y-3">
        {error && (
          <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center text-sm text-ink-500">
            We couldn&apos;t load your visits. Please try again.
          </div>
        )}
        {!error && visits === null &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
        }
        {!error && visits !== null && visits.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink-300 bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <CalendarClock className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-ink-900">No scheduled visits</h3>
            <p className="mt-1.5 text-sm text-ink-500">
              When you request a visit on a property, it will appear here with live status updates.
            </p>
            <Link to="/search" className="mt-5 inline-block">
              <button className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
                Find a property to visit
              </button>
            </Link>
          </div>
        )}
        {visits?.map((v) => (
          <div key={v.id} className="flex flex-col gap-3 rounded-2xl border border-ink-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Link to={`/property/${v.property?.id}`} className="font-semibold text-ink-900 hover:text-brand-700">
                {v.property?.title ?? "Property"}
              </Link>
              <p className="mt-0.5 text-sm text-ink-500">
                {v.property ? `${v.property.area}, ${v.property.city}` : ""}
              </p>
              <p className="mt-1.5 text-sm font-medium text-ink-700">
                {formatDateTime(`${v.visit_date}T${v.visit_time}`)}
                {" · "}
                {v.guests} {v.guests === 1 ? "visitor" : "visitors"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={statusTone[v.status]}>{visitStatusLabels[v.status]}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}