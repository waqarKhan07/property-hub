import { useMemo, useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BedDouble,
  Building2,
  CalendarDays,
  CheckCircle2,
  Heart,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { PropertyCard, PropertyGridSkeleton } from "@/components/PropertyCard";
import { SetupNotice } from "@/components/SetupNotice";
import { needsSetupBlock } from "@/lib/setup";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { queryProperties } from "@/lib/properties";
import { cityNames, propertyTypesByListing, propertyTypeLabels } from "@/lib/constants";
import type { ListingType, PropertyWithOwner, PropertyType } from "@/types";

function HeroSearch() {
  const navigate = useNavigate();
  const [listingType, setListingType] = useState<ListingType>("rent");
  const [city, setCity] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType | "">("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");

  const types = propertyTypesByListing[listingType];

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("listing_type", listingType);
    if (city) params.set("city", city);
    if (propertyType) params.set("property_type", propertyType);
    if (maxPrice) params.set("max_price", maxPrice);
    if (bedrooms) params.set("bedrooms", bedrooms);
    navigate(`/search?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl bg-white p-4 shadow-xl shadow-brand-950/20 sm:p-5"
      aria-label="Search properties"
    >
      <div className="flex flex-wrap gap-1 rounded-xl bg-ink-100 p-1">
        {(["rent", "sale"] as ListingType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setListingType(t)}
            aria-pressed={listingType === t}
            className={
              listingType === t
                ? "flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
                : "flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-ink-600 hover:text-ink-900"
            }
          >
            {t === "rent" ? "For Rent" : "For Sale"}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select label="City" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">All cities</option>
          {cityNames.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select
          label="Property type"
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value as PropertyType | "")}
        >
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {propertyTypeLabels[t]}
            </option>
          ))}
        </Select>
        <Input
          label="Max budget (PKR)"
          inputMode="numeric"
          placeholder="e.g. 60000"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d]/g, ""))}
        />
        <Select label="Bedrooms" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)}>
          <option value="">Any</option>
          {["1", "2", "3", "4", "5+"].map((b) => (
            <option key={b} value={b === "5+" ? "5" : b}>
              {b === "5+" ? "5 or more" : `${b}+`}
            </option>
          ))}
        </Select>
      </div>

      <Button type="submit" size="lg" fullWidth className="mt-4">
        <Search className="h-5 w-5" />
        Search {listingType === "rent" ? "rentals" : "properties"}
      </Button>
    </form>
  );
}

function AiSearchBox() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/search?ai=${encodeURIComponent(query.trim())}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-5 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur sm:p-5"
      aria-label="AI property search"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-300" />
        <p className="text-sm font-semibold text-white">Ask RentHub AI</p>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="I need a 2 bedroom apartment in DHA Lahore under 60,000 for my family"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-white"
        />
        <Button type="submit" variant="secondary" className="shrink-0">
          <Sparkles className="h-4 w-4" />
          Search with AI
        </Button>
      </div>
      <p className="mt-2 text-xs text-white/80">
        Describe what you need in plain language and we&apos;ll find matching properties.
      </p>
    </form>
  );
}

export default function HomePage() {
  useDocumentTitle("RentHub — Find a place you'll love");
  const { user } = useAuth();
  const [featured, setFeatured] = useState<PropertyWithOwner[] | null>(null);
  const [featuredError, setFeaturedError] = useState(false);

  useEffect(() => {
    let active = true;
    queryProperties({}, { pageSize: 8 })
      .then((res) => {
        if (!active) return;
        if (res.error) setFeaturedError(true);
        else setFeatured(res.data);
      })
      .catch(() => active && setFeaturedError(true));
    return () => {
      active = false;
    };
  }, []);

  const featuredList = useMemo(() => featured ?? [], [featured]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 pb-10 pt-12 sm:pt-16">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-brand-400/10 blur-3xl" />
          <div className="absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-amber-500/5 blur-3xl" />
        </div>
        <div className="container-app relative">
          <div className="mx-auto max-w-3xl text-center animate-fade-up">
            <h1 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              Find your next home in Pakistan
            </h1>
            <p className="mt-3 text-base text-brand-100 sm:text-lg">
              Rent or buy houses, apartments, portions and plots — verified listings, direct owner
              contact, easy visit scheduling.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-5xl animate-fade-up-delay-1">
            {needsSetupBlock() ? (
              <div className="rounded-2xl bg-white p-4 shadow-xl">
                <SetupNotice />
              </div>
            ) : (
              <>
                <HeroSearch />
                <AiSearchBox />
              </>
            )}
          </div>
        </div>
      </section>

      {/* Popular cities */}
      <section className="container-app py-10" aria-label="Popular cities">
        <h2 className="text-xl font-bold text-ink-900">Browse by city</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {cityNames.slice(0, 10).map((city) => (
            <Link
              key={city}
              to={`/search?city=${encodeURIComponent(city)}`}
              className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm font-medium text-ink-800 shadow-sm transition hover:border-brand-300 hover:text-brand-700"
            >
              <MapPin className="h-4 w-4 text-brand-600" />
              {city}
            </Link>
          ))}
        </div>
      </section>

      {/* Featured listings */}
      <section className="container-app py-8" aria-label="Featured properties">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-ink-900">Fresh on RentHub</h2>
          <Link to="/search" className="text-sm font-medium text-brand-600 hover:underline">
            View all
          </Link>
        </div>

        {featuredError && (
          <div className="rounded-2xl border border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
            We couldn&apos;t load listings right now. Please try again in a moment.
          </div>
        )}
        {!featured && !featuredError && <PropertyGridSkeleton count={8} />}
        {featured && featuredList.length === 0 && (
          <EmptyState
            icon={Building2}
            title="No listings yet"
            description="Be the first to list a property on RentHub — it's free."
            action={
              <Link to="/dashboard/properties/new">
                <Button>List your property</Button>
              </Link>
            }
          />
        )}
        {featured && featuredList.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featuredList.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="border-y border-ink-200 bg-white py-12">
        <div className="container-app">
          <h2 className="text-center text-2xl font-bold text-ink-900">How RentHub works</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl bg-ink-50 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-ink-900">1. Search your way</h3>
              <p className="mt-1.5 text-sm text-ink-600">
                Filter by city, area, budget and type — or just describe what you need and let
                RentHub AI find it.
              </p>
            </div>
            <div className="rounded-2xl bg-ink-50 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-ink-900">2. Talk to the owner</h3>
              <p className="mt-1.5 text-sm text-ink-600">
                Message owners, ask questions and share your details — without sharing your number
                with strangers.
              </p>
            </div>
            <div className="rounded-2xl bg-ink-50 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
                <CalendarDays className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-ink-900">3. Visit &amp; move in</h3>
              <p className="mt-1.5 text-sm text-ink-600">
                Request a visit, get it confirmed, see the place in person and confirm it&apos;s
                right for you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="bg-white pb-12">
        <div className="container-app">
          <h2 className="text-center text-2xl font-bold text-ink-900">Staying safe on RentHub</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-ink-500">
            We work hard to keep the marketplace trustworthy, but always stay alert — especially
            when money is involved.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, title: "Verification levels", text: "Accounts and listings go through defined, transparent checks — never vague promises." },
              { icon: Heart, title: "No cash before viewing", text: "Never pay any advance without visiting the property first." },
              { icon: MessageCircle, title: "Chat stays on-platform", text: "Keep conversations here so there's a record if something looks wrong." },
              { icon: CheckCircle2, title: "Report anything suspicious", text: "One tap to report a listing and our team reviews it." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 rounded-xl border border-ink-200 p-4">
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                <div>
                  <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                  <p className="mt-1 text-sm text-ink-600">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link to="/help" className="text-sm font-medium text-brand-600 hover:underline">
              Read our full safety guide
            </Link>
          </div>
        </div>
      </section>

      {/* Owner CTA */}
      <section className="container-app pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-6 py-10 text-center sm:px-12">
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Have a property to rent or sell?</h2>
            <p className="mt-2 text-brand-100">
              List it free on RentHub. Reach serious tenants and buyers, manage visits and messages
              from one dashboard.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to={user ? "/dashboard/properties/new" : "/register"}>
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  List your property
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-brand-200">
              <BedDouble className="h-3.5 w-3.5" /> Basic listings are free — no hidden fees.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}