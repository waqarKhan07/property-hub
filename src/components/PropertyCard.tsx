import { Link } from "react-router-dom";
import { Bath, BedDouble, Heart, MapPin, Maximize, ShieldCheck } from "lucide-react";
import { PropertyImage } from "@/components/PropertyImage";
import { Badge } from "@/components/ui/Badge";
import { useFavorites } from "@/hooks/useFavorites";
import { cn, formatArea, formatPrice, timeAgo } from "@/lib/utils";
import type { PropertyWithOwner } from "@/types";

export function PropertyCard({ property }: { property: PropertyWithOwner }) {
  const { favoriteIds, toggleFavorite } = useFavorites();
  const isFav = favoriteIds.has(property.id);
  const displayUnit = property.listing_type === "rent" ? property.price_unit : "total";

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
      <Link to={`/property/${property.id}`} className="relative block" aria-label={property.title}>
        <PropertyImage
          src={property.images?.[0] ?? null}
          alt={property.title}
          className="aspect-[4/3] w-full"
          eager={false}
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge tone={property.listing_type === "rent" ? "blue" : "ink"} className="shadow-sm">
            {property.listing_type === "rent" ? "For Rent" : "For Sale"}
          </Badge>
          {property.verification_status === "verified" && (
            <Badge tone="green" className="shadow-sm">
              <ShieldCheck className="h-3 w-3" /> Verified
            </Badge>
          )}
        </div>
        <span className="absolute bottom-3 right-3 rounded-md bg-ink-950/70 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
          {timeAgo(property.created_at)}
        </span>
      </Link>

      <button
        type="button"
        aria-label={isFav ? "Remove from saved" : "Save property"}
        onClick={(e) => {
          e.preventDefault();
          void toggleFavorite(property.id);
        }}
        className={cn(
          "absolute right-3 top-12 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow transition-transform hover:scale-110",
          isFav ? "text-red-500" : "text-ink-500",
        )}
      >
        <Heart className={cn("h-4.5 w-4.5", isFav && "fill-red-500 text-red-500")} />
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-lg font-bold text-brand-700">
            {formatPrice(Number(property.price), displayUnit === "monthly" ? "monthly" : "total")}
          </p>
        </div>
        <Link to={`/property/${property.id}`}>
          <h3 className="mt-1 line-clamp-2 font-semibold text-ink-900 group-hover:text-brand-700">
            {property.title}
          </h3>
        </Link>
        <p className="mt-1 flex items-center gap-1 truncate text-sm text-ink-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {property.area}, {property.city}
          </span>
        </p>

        <div className="mt-3 flex items-center gap-4 text-sm text-ink-600">
          {property.bedrooms != null && (
            <span className="flex items-center gap-1">
              <BedDouble className="h-4 w-4 text-ink-400" />
              {property.bedrooms}
            </span>
          )}
          {property.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4 text-ink-400" />
              {property.bathrooms}
            </span>
          )}
          {property.area_size != null && (
            <span className="flex items-center gap-1">
              <Maximize className="h-4 w-4 text-ink-400" />
              {formatArea(property.area_size, property.area_unit)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
          <div className="aspect-[4/3] animate-pulse bg-ink-200/70" />
          <div className="space-y-3 p-4">
            <div className="h-5 w-1/3 animate-pulse rounded bg-ink-200/70" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-ink-200/70" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-ink-200/70" />
          </div>
        </div>
      ))}
    </div>
  );
}