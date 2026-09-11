import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";

export function RequireAdmin() {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="container-app py-12">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  if (profile?.role !== "admin") return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}