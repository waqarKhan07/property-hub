import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Check, X, CalendarDays, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime, initials, todayISO } from "@/lib/utils";
import { visitStatusLabels } from "@/lib/constants";
import type { VisitRequest, VisitStatus } from "@/types";

const statusTone: Record<VisitStatus, "gray" | "blue" | "green" | "amber" | "red"> = {
  pending: "amber",
  confirmed: "green",
  reschedule_requested: "blue",
  completed: "gray",
  cancelled: "red",
  declined: "red",
};

interface Row extends VisitRequest {
  requester: { full_name: string | null } | null;
  property: { title: string } | null;
}

export default function OwnerVisitsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reschedule, setReschedule] = useState<Row | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error: err } = await supabase
      .from("visit_requests")
      .select("*, requester:requester_id(full_name), property:property_id(title)")
      .in("property.owner_id", [user.id])
      .order("created_at", { ascending: false });
    if (err) {
      setError(true);
      return;
    }
    setRows((data as Row[]) ?? []);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(row: Row, status: VisitStatus) {
    setBusyId(row.id);
    const { error: err } = await supabase.from("visit_requests").update({ status }).eq("id", row.id);
    setBusyId(null);
    if (!err) await load();
  }

  async function submitReschedule(e: FormEvent) {
    e.preventDefault();
    if (!reschedule || !newDate || !newTime) return;
    setBusyId(reschedule.id);
    const { error: err } = await supabase
      .from("visit_requests")
      .update({ visit_date: newDate, visit_time: newTime, status: "reschedule_requested" })
      .eq("id", reschedule.id);
    setBusyId(null);
    if (!err) {
      setReschedule(null);
      await load();
    }
  }

  return (
    <div className="container-app py-8">
      <div className="grid gap-3 lg:grid-cols-[240px_1fr] lg:gap-6">
        <aside className="rounded-2xl border border-ink-200 bg-white p-4">
          <DashboardNav active="/dashboard/visits" />
        </aside>

        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink-900">Visit requests</h1>
          <p className="mt-1 text-sm text-ink-500">
            Confirm, reschedule or decline visits for your properties.
          </p>

          <div className="mt-6 space-y-3">
            {error && (
              <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center text-sm text-ink-500">
                We couldn&apos;t load visit requests. Please try again.
              </div>
            )}
            {!error && rows === null &&
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)
            }
            {!error && rows !== null && rows.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ink-300 bg-white px-6 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <CalendarClock className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-ink-900">No visit requests</h3>
                <p className="mt-1.5 text-sm text-ink-500">
                  When someone requests to see your property, it&apos;ll show up here so you can confirm it.
                </p>
              </div>
            )}
            {rows?.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/property/${r.property_id}`} className="font-semibold text-ink-900 hover:text-brand-700">
                        {r.property?.title ?? "Property"}
                      </Link>
                      <Badge tone={statusTone[r.status]}>{visitStatusLabels[r.status]}</Badge>
                    </div>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-700">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4 text-brand-600" />
                        {formatDateTime(`${r.visit_date}T${r.visit_time}`)}
                      </span>
                      <span>{r.guests} {r.guests === 1 ? "visitor" : "visitors"}</span>
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-100 text-[10px] font-bold text-ink-600">
                        {initials(r.requester?.full_name)}
                      </span>
                      {r.requester?.full_name ?? "A RentHub member"}
                    </p>
                    {r.message && (
                      <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600">
                        &quot;{r.message}&quot;
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {r.status === "pending" && (
                      <>
                        <Button size="sm" loading={busyId === r.id} onClick={() => void updateStatus(r, "confirmed")}>
                          <Check className="h-4 w-4" /> Confirm
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setReschedule(r); setNewDate(r.visit_date); setNewTime(r.visit_time); }}>
                          <Undo2 className="h-4 w-4" /> Propose time
                        </Button>
                        <Button size="sm" variant="danger-outline" loading={busyId === r.id} onClick={() => void updateStatus(r, "declined")}>
                          <X className="h-4 w-4" /> Decline
                        </Button>
                      </>
                    )}
                    {r.status === "reschedule_requested" && (
                      <>
                        <Button size="sm" loading={busyId === r.id} onClick={() => void updateStatus(r, "confirmed")}>
                          <Check className="h-4 w-4" /> Accept new time
                        </Button>
                        <Button size="sm" variant="danger-outline" onClick={() => void updateStatus(r, "declined")}>
                          <X className="h-4 w-4" /> Decline
                        </Button>
                      </>
                    )}
                    {r.status === "confirmed" && (
                      <>
                        <Button size="sm" variant="brand-soft" onClick={() => void updateStatus(r, "completed")}>
                          <Check className="h-4 w-4" /> Mark completed
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void updateStatus(r, "cancelled")}>
                          <X className="h-4 w-4" /> Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Modal open={Boolean(reschedule)} onClose={() => setReschedule(null)} title="Propose another time" size="sm">
        <form onSubmit={submitReschedule} className="grid gap-4">
          <Input
            type="date"
            label="New date"
            min={todayISO()}
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            required
          />
          <Input
            type="time"
            label="New time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => setReschedule(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={busyId === reschedule?.id}>
              Send proposal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}