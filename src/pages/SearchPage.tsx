import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Building2, Filter, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PropertyCard, PropertyGridSkeleton } from "@/components/PropertyCard";
import { parseNaturalSearch } from "@/lib/aiSearch";
import { buildPropertyQuery, type PropertyFilters } from "@/lib/properties";
import { allAreas, cityNames, cities, propertyTypeLabels, propertyTypesByListing } from "@/lib/constants";
import type { ListingType, PropertyWithOwner, PropertyType } from "@/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 18;

function serialize(f: PropertyFilters): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === "" || v === null) continue;
    params.set(k, String(v));
  }
  return params.toString();
}

function parseParams(params: URLSearchParams): PropertyFilters {
  const filters: PropertyFilters = {};
  const listing = params.get("listing_type");
  if (listing === "rent" || listing === "sale") filters.listing_type = listing;
  const city = params.get("city");
  if (city) filters.city = city;
  const area = params.get("area");
  if (area) filters.area = area;
  const type = params.get("property_type");
  if (type && type in propertyTypeLabels) {
    filters.property_type = type as PropertyType;
    const allowed = propertyTypesByListing[filters.listing_type ?? "rent"];
    if (!allowed.includes(filters.property_type)) filters.property_type = undefined;
  }
  const minPrice = params.get("min_price");
  if (minPrice && Number(minPrice) >= 0) filters.min_price = Number(minPrice);
  const maxPrice = params.get("max_price");
  if (maxPrice && Number(maxPrice) >= 0) filters.max_price = Number(maxPrice);
  const bedrooms = params.get("bedrooms");
  if (bedrooms && Number(bedrooms) > 0) filters.bedrooms = Number(bedrooms);
  const bathrooms = params.get("bathrooms");
  if (bathrooms && Number(bathrooms) > 0) filters.bathrooms = Number(bathrooms);
  const furnished = params.get("furnished");
  if (furnished === "true") filters.furnished = true;
  if (furnished === "false") filters.furnished = false;
  if (params.get("verified") === "true") filters.verified = true;
  const q = params.get("q");
  if (q) filters.q = q;
  const sort = params.get("sort");
  if (sort && ["newest", "price_asc", "price_desc", "most_viewed"].includes(sort)) {
    filters.sort = sort as PropertyFilters["sort"];
  }
  return filters;
}

function FilterPanel({
  filters,
  onChange,
  compact = false,
}: {
  filters: PropertyFilters;
  onChange: (f: PropertyFilters) => void;
  compact?: boolean;
}) {
  const set = (patch: Partial<PropertyFilters>) => onChange({ ...filters, ...patch });
  const typeOptions = propertyTypesByListing[filters.listing_type ?? "rent"];

  return (
    <div className={cn("grid gap-4", compact ? "" : "lg:sticky lg:top-20")}>
      <div>
        <p className="mb-2 text-sm font-semibold text-ink-800">Purpose</p>
        <div className="flex gap-1 rounded-xl bg-ink-100 p-1">
          {(["rent", "sale"] as ListingType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set({ listing_type: t, property_type: undefined, area: undefined })}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm font-semibold",
                filters.listing_type === t
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-ink-600 hover:text-ink-900",
              )}
            >
              {t === "rent" ? "Rent" : "Buy"}
            </button>
          ))}
        </div>
      </div>

      <Select
        label="City"
        value={filters.city ?? ""}
        onChange={(e) => set({ city: e.target.value || undefined, area: undefined })}
      >
        <option value="">All cities</option>
        {cityNames.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>

      <Select
        label="Area"
        value={filters.area ?? ""}
        onChange={(e) => set({ area: e.target.value || undefined })}
      >
        <option value="">All areas</option>
        {(filters.city
          ? (cities.find((c) => c.city === filters.city)?.areas ?? [])
          : allAreas
        ).map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </Select>

      <Select
        label="Property type"
        value={filters.property_type ?? ""}
        onChange={(e) => set({ property_type: (e.target.value || undefined) as PropertyType | undefined })}
      >
        <option value="">All types</option>
        {typeOptions.map((t) => (
          <option key={t} value={t}>
            {propertyTypeLabels[t]}
          </option>
        ))}
      </Select>

      <fieldset className="grid grid-cols-2 gap-3">
        <Input
          label="Min price"
          inputMode="numeric"
          placeholder="Any"
          value={filters.min_price != null ? String(filters.min_price) : ""}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\d]/g, "");
            set({ min_price: v ? Number(v) : undefined });
          }}
        />
        <Input
          label="Max price"
          inputMode="numeric"
          placeholder="Any"
          value={filters.max_price != null ? String(filters.max_price) : ""}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\d]/g, "");
            set({ max_price: v ? Number(v) : undefined });
          }}
        />
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Bedrooms"
          value={filters.bedrooms != null ? String(filters.bedrooms) : ""}
          onChange={(e) => set({ bedrooms: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">Any</option>
          {["1", "2", "3", "4", "5", "6"].map((b) => (
            <option key={b} value={b}>
              {b}+
            </option>
          ))}
        </Select>
        <Select
          label="Bathrooms"
          value={filters.bathrooms != null ? String(filters.bathrooms) : ""}
          onChange={(e) => set({ bathrooms: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">Any</option>
          {["1", "2", "3", "4", "5"].map((b) => (
            <option key={b} value={b}>
              {b}+
            </option>
          ))}
        </Select>
      </div>

      <Select
        label="Furnished"
        value={filters.furnished == null ? "" : String(filters.furnished)}
        onChange={(e) => {
          const v = e.target.value;
          set({ furnished: v === "" ? undefined : v === "true" });
        }}
      >
        <option value="">Any</option>
        <option value="true">Furnished</option>
        <option value="false">Unfurnished</option>
      </Select>

      <label className="flex items-center gap-2 text-sm font-medium text-ink-800">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
          checked={filters.verified === true}
          onChange={(e) => set({ verified: e.target.checked ? true : undefined })}
        />
        Verified listings only
      </label>
    </div>
  );
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<PropertyFilters>(() => parseParams(searchParams));

  const aiQuery = searchParams.get("ai") ?? "";
  const aiResult = aiQuery ? parseNaturalSearch(aiQuery) : null;

  const [results, setResults] = useState<PropertyWithOwner[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Sync URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(serialize(filters));
    if (aiQuery) params.set("ai", aiQuery);
    setSearchParams(params, { replace: true });
  }, [filters, aiQuery, setSearchParams]);

  // Fetch results
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    const query = buildPropertyQuery(filters).range(0, PAGE_SIZE - 1);
    query.then(
      ({ data, count: c, error: err }) => {
        if (!active) return;
        if (err) {
          setError(true);
          setResults([]);
          setCount(null);
          setHasMore(false);
        } else {
          setResults((data as PropertyWithOwner[]) ?? []);
          setCount(c ?? null);
          setHasMore((data?.length ?? 0) === PAGE_SIZE);
        }
        setLoading(false);
      },
      () => {
        if (!active) return;
        setError(true);
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [filters]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const from = results.length;
    const { data, error: err } = await buildPropertyQuery(filters).range(from, from + PAGE_SIZE - 1);
    if (!err && data) {
      setResults((prev) => [...prev, ...(data as PropertyWithOwner[])]);
      setHasMore(data.length === PAGE_SIZE);
      setCount((prev) => (prev == null ? prev : Math.max(prev, from + data.length)));
    }
    setLoadingMore(false);
  }, [filters, results.length, loadingMore]);

  const onAiFilterClick = () => {
    setFilters(aiResult?.filters ?? {});
    setSearchParams(new URLSearchParams(serialize(aiResult?.filters ?? {})), { replace: true });
  };

  const activeChips: { label: string; clear: () => void }[] = [];
  if (filters.city) activeChips.push({ label: filters.city, clear: () => setFilters({ ...filters, city: undefined, area: undefined }) });
  if (filters.area) activeChips.push({ label: filters.area, clear: () => setFilters({ ...filters, area: undefined }) });
  if (filters.property_type) activeChips.push({ label: propertyTypeLabels[filters.property_type], clear: () => setFilters({ ...filters, property_type: undefined }) });
  if (filters.bedrooms) activeChips.push({ label: `${filters.bedrooms}+ beds`, clear: () => setFilters({ ...filters, bedrooms: undefined }) });
  if (filters.min_price != null) activeChips.push({ label: `From PKR ${filters.min_price.toLocaleString("en-PK")}`, clear: () => setFilters({ ...filters, min_price: undefined }) });
  if (filters.max_price != null) activeChips.push({ label: `Up to PKR ${filters.max_price.toLocaleString("en-PK")}`, clear: () => setFilters({ ...filters, max_price: undefined }) });
  if (filters.furnished === true) activeChips.push({ label: "Furnished", clear: () => setFilters({ ...filters, furnished: undefined }) });
  if (filters.furnished === false) activeChips.push({ label: "Unfurnished", clear: () => setFilters({ ...filters, furnished: undefined }) });
  if (filters.verified) activeChips.push({ label: "Verified", clear: () => setFilters({ ...filters, verified: undefined }) });

  const title = filters.city ? `Properties for ${filters.listing_type === "sale" ? "sale" : "rent"} in ${filters.city}` : `Properties for ${filters.listing_type === "sale" ? "sale" : "rent"}`;

  return (
    <div className="container-app py-6">
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Desktop filter sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="rounded-2xl border border-ink-200 bg-white p-5">
            <FilterPanel filters={filters} onChange={setFilters} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Top bar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-ink-900">{title}</h1>
              <p className="text-sm text-ink-500">
                {loading ? "Searching…" : count != null ? `${count.toLocaleString("en-PK")} listing${count === 1 ? "" : "s"}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="lg:hidden"
                onClick={() => setShowFilters(true)}
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
              <Select
                className="w-40"
                value={filters.sort ?? "newest"}
                onChange={(e) => setFilters({ ...filters, sort: e.target.value as PropertyFilters["sort"] })}
                aria-label="Sort results"
              >
                <option value="newest">Newest first</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="most_viewed">Most viewed</option>
              </Select>
            </div>
          </div>

          {/* AI mode panel */}
          {aiResult && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-semibold text-amber-900">
                  AI assistant: &ldquo;{aiQuery}&rdquo;
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {aiResult.notes.map((n) => (
                  <Badge key={n} tone="amber">{n}</Badge>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={onAiFilterClick}>
                  <Search className="h-4 w-4" />
                  Apply these filters
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSearchParams(new URLSearchParams(), { replace: true });
                    setFilters({});
                  }}
                >
                  <X className="h-4 w-4" />
                  Clear AI
                </Button>
              </div>
            </div>
          )}

          {/* Filter chips */}
          {activeChips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <span key={chip.label} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
                  {chip.label}
                  <button type="button" onClick={chip.clear} aria-label={`Remove ${chip.label} filter`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setFilters({})}
                className="text-sm font-medium text-ink-500 hover:text-ink-800"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Search input */}
          <div className="mb-6">
            <Input
              placeholder="Search by keyword, e.g. DHA, Bahria Town, furnished…"
              value={filters.q ?? ""}
              onChange={(e) => setFilters({ ...filters, q: e.target.value || undefined })}
            />
          </div>

          {/* Results */}
          {error && (
            <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center text-sm text-ink-500">
              We couldn&apos;t load listings. Please try again.
            </div>
          )}
          {!error && loading && <PropertyGridSkeleton count={6} />}
          {!error && !loading && results.length === 0 && (
            <EmptyState
              icon={Building2}
              title="No properties found"
              description="Try changing your filters or searching in a different city."
              action={
                <Button variant="outline" onClick={() => setFilters({})}>
                  Clear all filters
                </Button>
              }
            />
          )}
          {!error && !loading && results.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
              {hasMore && (
                <div className="mt-8 text-center">
                  <Button variant="outline" loading={loadingMore} onClick={() => void loadMore()}>
                    Load more listings
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      {showFilters && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 animate-overlay-in bg-ink-950/50"
            onClick={() => setShowFilters(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] animate-sheet-in overflow-y-auto rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-900">Filters</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <FilterPanel filters={filters} onChange={setFilters} compact />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setFilters({})}>
                Clear all
              </Button>
              <Button onClick={() => setShowFilters(false)}>Show results</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}