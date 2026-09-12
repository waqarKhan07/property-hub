import { describe, expect, it } from "vitest";
import { parseNaturalSearch } from "@/lib/aiSearch";

describe("parseNaturalSearch", () => {
  it("parses a full rent query", () => {
    const r = parseNaturalSearch("2 bed flat for rent in DHA Lahore under 60k");
    expect(r.filters.listing_type).toBe("rent");
    expect(r.filters.city).toBe("Lahore");
    expect(r.filters.area).toBe("DHA");
    expect(r.filters.property_type).toBe("apartment");
    expect(r.filters.bedrooms).toBe(2);
    expect(r.filters.max_price).toBe(60_000);
  });

  it("parses a sale query with a budget", () => {
    const r = parseNaturalSearch("3 bedroom house for sale in DHA Islamabad under 45 lakh");
    expect(r.filters.listing_type).toBe("sale");
    expect(r.filters.city).toBe("Islamabad");
    expect(r.filters.area).toBe("DHA Islamabad");
    expect(r.filters.property_type).toBe("house");
    expect(r.filters.bedrooms).toBe(3);
    expect(r.filters.max_price).toBe(4_500_000);
  });

  it("defaults to a monthly rent budget cap for standalone amounts", () => {
    const r = parseNaturalSearch("room for rent 60k in Bahria Town");
    expect(r.filters.listing_type).toBe("rent");
    expect(r.filters.property_type).toBe("room");
    expect(r.filters.area).toBe("Bahria Town");
    expect(r.filters.max_price).toBe(60_000);
  });

  it("under budget uses crore scaling", () => {
    const r = parseNaturalSearch("under 1 crore house for sale");
    expect(r.filters.listing_type).toBe("sale");
    expect(r.filters.property_type).toBe("house");
    expect(r.filters.max_price).toBe(10_000_000);
  });

  it("detects furnished", () => {
    const r = parseNaturalSearch("furnished flat for rent in Karachi");
    expect(r.filters.furnished).toBe(true);
    expect(r.filters.listing_type).toBe("rent");
    expect(r.filters.city).toBe("Karachi");
  });

  it("detects verified listings", () => {
    const r = parseNaturalSearch("verified apartment in Lahore");
    expect(r.filters.verified).toBe(true);
  });

  it("matches the area from the matched city first", () => {
    const r = parseNaturalSearch("flat in DHA Karachi");
    expect(r.filters.city).toBe("Karachi");
    expect(r.filters.area).toBe("DHA");
  });

  it("returns a fallback note when nothing matches", () => {
    const r = parseNaturalSearch("hello world please");
    expect(r.filters).toEqual({});
    expect(r.notes).toContain("Showing popular active listings");
  });
});