import { cities, cityNames, propertyTypeLabels } from "@/lib/constants";
import type { PropertyFilters } from "@/lib/properties";
import type { PropertyType } from "@/types";

export interface AiParseResult {
  filters: PropertyFilters;
  notes: string[];
}

const PRICE_WORDS: Record<string, number> = {
  k: 1_000,
  thousand: 1_000,
  thousands: 1_000,
  lac: 100_000,
  lakh: 100_000,
  lacs: 100_000,
  lakhs: 100_000,
  crore: 10_000_000,
  crores: 10_000_000,
  million: 1_000_000,
};

const typeKeywords: { re: RegExp; type: PropertyType }[] = [
  { re: /(flat|apartment|appt)/i, type: "apartment" },
  { re: /(house|home|bungalow|villa|residence)/i, type: "house" },
  { re: /portion/i, type: "portion" },
  { re: /(room|bed space)/i, type: "room" },
  { re: /(plot|land|khasra)/i, type: "plot" },
  { re: /(shop|showroom)/i, type: "shop" },
  { re: /office/i, type: "office" },
  { re: /(warehouse|godown|factory)/i, type: "warehouse" },
];

function parsePriceToken(token: string): number | null {
  const value = token.replace(/,/g, "");
  const match = value.match(/^(\d+(?:\.\d+)?)\s*(k|thousand|thousands|lac|lakh|lacs|lakhs|crore|crores|million)?$/i);
  if (!match) return null;
  const num = parseFloat(match[1]);
  if (!num) return null;
  const unit = match[2] ? match[2].toLowerCase() : "";
  const multiplier = PRICE_WORDS[unit] ?? 1;
  return Math.round(num * multiplier);
}

export function parseNaturalSearch(rawQuery: string): AiParseResult {
  const query = rawQuery.trim();
  const lowered = query.toLowerCase();
  const filters: PropertyFilters = {};
  const notes: string[] = [];

  // Listing type (defaults to rent)
  if (/\b(buy|purchase|for sale|for-sale|sale|sell|selling)\b/i.test(query)) {
    filters.listing_type = "sale";
    notes.push("Looking to buy");
  } else if (/\b(rent|rental|lease|renting|to let)\b/i.test(query)) {
    filters.listing_type = "rent";
    notes.push("Looking to rent");
  }

  // City
  const matchedCity = cityNames.find((c) => lowered.includes(c.toLowerCase()));
  if (matchedCity) {
    filters.city = matchedCity;
    notes.push(`City: ${matchedCity}`);
  }

  // Area (prefer areas of the matched city)
  const areaPool = matchedCity
    ? (cities.find((c) => c.city === matchedCity)?.areas ?? [])
    : cities.flatMap((c) => c.areas);
  const matchedArea = areaPool.find((a) => lowered.includes(a.toLowerCase()));
  if (matchedArea) {
    filters.area = matchedArea;
    notes.push(`Area: ${matchedArea}`);
  }

  // Property type
  for (const { re, type } of typeKeywords) {
    if (re.test(query)) {
      filters.property_type = type;
      notes.push(`Type: ${propertyTypeLabels[type]}`);
      break;
    }
  }

  // Bedrooms
  const bedMatch = query.match(/(\d)\s*(?:bed(?:room)?s?)\b/i) ?? query.match(/(\d)\s*bed\b/i);
  if (bedMatch) {
    filters.bedrooms = parseInt(bedMatch[1], 10);
    notes.push(`At least ${filters.bedrooms} bedroom${filters.bedrooms > 1 ? "s" : ""}`);
  }

  // Furnished
  if (/\bfurnished\b/i.test(query)) {
    filters.furnished = true;
    notes.push("Furnished only");
  }

  // "under / below / within 60,000"
  const underMatch = query.match(
    /(?:under|below|within|upto|up to|less than|max(?:imum)?|budget of|beneath)\s+([\d,]+(?:\.\d+)?(?:\s*(?:lac|lakh|crore|thousand|k))?)/i,
  );
  if (underMatch) {
    const value = parsePriceToken(underMatch[1].trim());
    if (value) {
      filters.max_price = value;
      notes.push(`Budget cap: PKR ${value.toLocaleString("en-PK")}`);
    }
  }

  // "over / above 45 lakh"
  const overMatch = query.match(
    /(?:over|above|more than|min(?:imum)?|at least)\s+([\d,]+(?:\.\d+)?(?:\s*(?:lac|lakh|crore|thousand|k))?)/i,
  );
  if (overMatch) {
    const value = parsePriceToken(overMatch[1].trim());
    if (value) {
      filters.min_price = value;
      notes.push(`Minimum price: PKR ${value.toLocaleString("en-PK")}`);
    }
  }

  // Standalone budget token, e.g. "60k" / "45 lac"
  if (filters.max_price == null && filters.min_price == null) {
    const standalone = query.match(/\b(\d+[\d,]*\.?\d*\s*(?:lac|lakh|crore|thousand|k))\b/i);
    if (standalone) {
      const value = parsePriceToken(standalone[1].trim());
      if (value) {
        if (filters.listing_type === "sale") {
          filters.min_price = value;
          filters.max_price = value;
          notes.push(`Price: PKR ${value.toLocaleString("en-PK")}`);
        } else {
          const monthly = value >= 1_000_000 ? Math.round(value / 10) : value;
          filters.max_price = monthly;
          notes.push(`Rent budget cap: PKR ${monthly.toLocaleString("en-PK")}/month (interpreted)`);
        }
      }
    }
  }

  if (/\bverified\b/i.test(query)) {
    filters.verified = true;
    notes.push("Verified listings only");
  }

  if (notes.length === 0) {
    notes.push("Showing popular active listings");
  }

  return { filters, notes };
}