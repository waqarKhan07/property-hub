import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, PlusCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatCompactPrice, timeAgo } from "@/lib/utils";
import { propertyTypeLabels, propertyStatusLabels, propertyStatusTone } from "@/lib/constants";
import type { Property } from "@/types";

export default function MyPropertiesPage() {
  useDocumentTitle("My properties — RentHub");
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[] | null>(null);
  const [error, setError] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error: err } = await supabase
      .from("properties")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (err) {
      setError(true);
      return;
    }
    setProperties((data as Property[]) ?? []);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(p: Property, status: "paused" | "active") {
    if (status === "paused") {
      const { error: err } = await supabase.rpc("owner_set_property_status", { property: p.id, new_status: "paused" });
      if (!err) await load();
    } else {
      const { error: err } = await supabase.rpc("publish_property", { property: p.id });
      if (!err) await load();
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: err } = await supabase.from("properties").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (!err) {
      setDeleteTarget(null);
      await load();
    }
  }

  return (
    <div className="container-app py-8">
      <div className="grid gap-3 lg:grid-cols-[240px_1fr] lg:gap-6">
        <aside className="rounded-2xl border border-ink-200 bg-white p-4">
          <DashboardNav active="/dashboard/properties" />
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-ink-900">My properties</h1>
              <p className="mt-1 text-sm text-ink-500">
                {properties ? `${properties.length} listing${properties.length === 1 ? "" : "s"}` : ""}
              </p>
            </div>
            <Link to="/dashboard/properties/new">
              <Button>
                <PlusCircle className="h-4 w-4" />
                Add property
              </Button>
            </Link>
          </div>

          <div className="mt-6 space-y-2">
            {error && (
              <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center text-sm text-ink-500">
                We couldn&apos;t load your properties. Please try again.
              </div>
            )}
            {!error && properties === null &&
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
            }
            {!error && properties !== null && properties.length === 0 && (
              <EmptyState
                icon={PlusCircle}
                title="No listings yet"
                description="List your first property — it's free and takes a few minutes with our step-by-step form."
                action={
                  <Link to="/dashboard/properties/new">
                    <Button>Add your first property</Button>
                  </Link>
                }
              />
            )}
            {properties?.map((p) => (
              <Card key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <Link to={`/property/${p.id}`} className="block truncate font-semibold text-ink-900 hover:text-brand-700">
                      {p.title}
                    </Link>
                    <p className="mt-0.5 truncate text-sm text-ink-500">
                      {propertyTypeLabels[p.property_type]} · {p.area}, {p.city} ·{" "}
                      <span className="font-medium text-ink-700">{formatCompactPrice(Number(p.price))}</span>
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge tone={propertyStatusTone[p.status]}>{propertyStatusLabels[p.status]}</Badge>
                      <span className="text-xs text-ink-400">
                        {p.views_count} views · {p.favorites_count} saves · listed {timeAgo(p.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link to={`/dashboard/properties/${p.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  </Link>
                  {p.status === "active" ? (
                    <Button variant="outline" size="sm" onClick={() => void setStatus(p, "paused")}>
                      Pause
                    </Button>
                  ) : p.status === "paused" || p.status === "draft" ? (
                    <Button variant="brand-soft" size="sm" onClick={() => void setStatus(p, "active")}>
                      Publish
                    </Button>
                  ) : null}
                  <Button variant="danger-outline" size="sm" onClick={() => setDeleteTarget(p)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete this listing?" size="sm">
        <p className="text-sm text-ink-600">
          This will permanently remove <strong>{deleteTarget?.title}</strong>. Chat history and visit
          requests linked to it will also be removed.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={deleting} onClick={() => void confirmDelete()}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}