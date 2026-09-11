import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

export function RequireOwner() {
  const { session, profile, loading, refreshProfile } = useAuth();
  const location = useLocation();
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="container-app py-12">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  if (profile?.role === "owner" || profile?.role === "admin") return <Outlet />;

  return (
    <div className="container-app flex min-h-[60vh] max-w-lg flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <ShieldCheck className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-bold text-ink-900">Become a property owner</h1>
      <p className="mt-2 text-sm text-ink-600">
        Listing on RentHub is free. Create an owner profile to post properties, receive inquiries,
        and manage visits — all in one place.
      </p>
      {profile?.verification_status === "unverified" && (
        <div className="mt-4">
          <Badge tone="amber">Account verification recommended for more trust</Badge>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <Button
        className="mt-6"
        size="lg"
        loading={promoting}
        onClick={async () => {
          setPromoting(true);
          setError(null);
          const { error: rpcError } = await supabase.rpc("promote_to_owner");
          if (rpcError) {
            setError("We couldn't update your account. Please try again.");
          } else {
            await refreshProfile();
          }
          setPromoting(false);
        }}
      >
        Continue as owner — it&apos;s free
      </Button>
    </div>
  );
}