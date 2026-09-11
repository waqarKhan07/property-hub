import { supabase } from "@/lib/supabase";
import type { ListingType, PropertyType, PropertyWithOwner } from "@/types";

export interface PropertyFilters {
  listing_type?: ListingType;
  city?: string;
  area?: string;
  property_type?: PropertyType;
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  bathrooms?: number;
  furnished?: boolean;
  verified?: boolean;
  q?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "most_viewed";
}

export const DEFAULT_SORT = "newest";

export function buildPropertyQuery(filters: PropertyFilters) {
  let query = supabase
    .from("properties")
    .select(
      "*, owner:owner_id(id, full_name, avatar_url, verification_status)",
      { count: "exact" },
    );

  query = query.eq("status", "active").neq("verification_status", "suspended");

  if (filters.listing_type) query = query.eq("listing_type", filters.listing_type);
  if (filters.city) query = query.ilike("city", `%${filters.city}%`);
  if (filters.area) query = query.ilike("area", `%${filters.area}%`);
  if (filters.property_type) query = query.eq("property_type", filters.property_type);
  if (filters.min_price != null) query = query.gte("price", filters.min_price);
  if (filters.max_price != null) query = query.lte("price", filters.max_price);
  if (filters.bedrooms) query = query.gte("bedrooms", filters.bedrooms);
  if (filters.bathrooms) query = query.gte("bathrooms", filters.bathrooms);
  if (filters.furnished === true) query = query.eq("furnished", true);
  if (filters.furnished === false) query = query.neq("furnished", true);
  if (filters.verified) query = query.eq("verification_status", "verified");
  if (filters.q) {
    query = query.or(
      `title.ilike.%${escapeLike(filters.q)}%,city.ilike.%${escapeLike(filters.q)}%,area.ilike.%${escapeLike(filters.q)}%`,
    );
  }

  const sort = filters.sort ?? DEFAULT_SORT;
  if (sort === "price_asc") query = query.order("price", { ascending: true });
  else if (sort === "price_desc") query = query.order("price", { ascending: false });
  else if (sort === "most_viewed") query = query.order("views_count", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  return query;
}

function escapeLike(value: string): string {
  return value.replace(/[%_,\\]/g, (m) => `\\${m}`);
}

export async function queryProperties(
  filters: PropertyFilters,
  opts: { from?: number; to?: number; page?: number; pageSize?: number } = {},
): Promise<{ data: PropertyWithOwner[]; count: number | null; error: Error | null }> {
  let query = buildPropertyQuery(filters);

  if (opts.from != null && opts.to != null) {
    query = query.range(opts.from, opts.to);
  } else {
    const page = opts.page ?? 0;
    const pageSize = opts.pageSize ?? 18;
    query = query.range(page * pageSize, (page + 1) * pageSize - 1);
  }

  const { data, count, error } = await query;
  return { data: (data as PropertyWithOwner[]) ?? [], count, error };
}

export async function getProperty(id: string): Promise<PropertyWithOwner | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("*, owner:owner_id(id, full_name, avatar_url, verification_status)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as PropertyWithOwner) ?? null;
}