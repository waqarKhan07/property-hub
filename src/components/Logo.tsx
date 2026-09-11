import { Home } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2", className)} aria-label="RentHub home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
        <Home className="h-5 w-5" aria-hidden="true" />
      </span>
      {showText && (
        <span className="text-xl font-bold tracking-tight text-ink-900">
          Rent<span className="text-brand-600">Hub</span>
        </span>
      )}
    </Link>
  );
}