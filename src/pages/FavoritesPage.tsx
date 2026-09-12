import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { PropertyCard, PropertyGridSkeleton } from "@/components/PropertyCard";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { PropertyWithOwner } from "@/types";

export default function FavoritesPage() {
  useDocumentTitle("Saved properties — RentHub");
  const { user } = useAuth();
  const [properties, setProperties] = useState<PropertyWithOwner[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase
      .from("favorites")
      .select("property:property_id(*, owner:owner_id(id, full_name, avatar_url, verification_status))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err) {
          setError(true);
          return;
        }
        const list = (data ?? [])
          .map((r) => r.property as unknown as PropertyWithOwner | null)
          .filter((p): p is PropertyWithOwner => p !== null);
        setProperties(list);
      });
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <div className="container-app py-8">
      <h1 className="text-2xl font-bold text-ink-900">Saved properties</h1>
      <p className="mt-1 text-sm text-ink-500">
        Your favourites are saved securely to your account.
      </p>

      <div className="mt-6">
        {error && (
          <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center text-sm text-ink-500">
            We couldn&apos;t load your favourites. Please try again.
          </div>
        )}
        {!error && properties === null && <PropertyGridSkeleton count={6} />}
        {!error && properties !== null && properties.length === 0 && (
          <EmptyState
            icon={Heart}
            title="No saved properties yet"
            description="Tap the heart on any property to save it here so you can find it again easily."
            action={
              <Link to="/search">
                <Button>Start searching</Button>
              </Link>
            }
          />
        )}
        {!error && properties !== null && properties.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {properties.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}