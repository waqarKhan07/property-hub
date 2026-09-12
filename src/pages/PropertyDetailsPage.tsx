import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  BadgeCheck,
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  Eye,
  Flag,
  Heart,
  Home,
  MapPin,
  Maximize,
  MessageCircle,
  MoveRight,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { PropertyImage } from "@/components/PropertyImage";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { getProperty } from "@/lib/properties";
import { supabase } from "@/lib/supabase";
import { todayISO, timeAgo, formatPrice, formatArea, formatDate, cn, copyText, initials as genericInitials } from "@/lib/utils";
import { propertyTypeLabels, reportReasons, priceUnitLabels, listingTypeLabels } from "@/lib/constants";
import type { PropertyWithOwner, VisitStatus } from "@/types";

const VIEW_COOLDOWN_MS = 30 * 60 * 1000;

function shouldCountView(propertyId: string): boolean {
  const key = `renthub:view:${propertyId}`;
  const last = Number(localStorage.getItem(key) ?? 0);
  if (Date.now() - last < VIEW_COOLDOWN_MS) return false;
  localStorage.setItem(key, String(Date.now()));
  return true;
}

function Gallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const list = images.length > 0 ? images : [""];

  useEffect(() => {
    if (!zoom) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setZoom(false);
      } else if (e.key === "ArrowRight") {
        setActive((a) => Math.min(a + 1, list.length - 1));
      } else if (e.key === "ArrowLeft") {
        setActive((a) => Math.max(a - 1, 0));
      }
    }
    document.addEventListener("keydown", onKey);
    const closeButton = document.querySelector<HTMLButtonElement>('button[aria-label="Close gallery"]');
    closeButton?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [zoom, list.length]);

  return (
    <div>
      <button
        type="button"
        onClick={() => images.length > 0 && setZoom(true)}
        className="block w-full"
        aria-label="View image gallery"
      >
        <PropertyImage
          src={list[Math.min(active, list.length - 1)]}
          alt={title}
          eager
          className="aspect-[16/10] w-full rounded-2xl sm:aspect-[16/9]"
        />
      </button>
      {images.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {list.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              className={cn(
                "h-16 w-24 shrink-0 overflow-hidden rounded-lg transition",
                active === i ? "ring-2 ring-brand-600 ring-offset-2" : "opacity-70 hover:opacity-100",
              )}
            >
              <PropertyImage src={img} alt="" className="h-full w-full" />
            </button>
          ))}
        </div>
      )}
      {zoom && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink-950/95 p-4">
          <button
            type="button"
            aria-label="Close gallery"
            className="absolute right-4 top-4 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
            onClick={() => setZoom(false)}
          >
            Close
          </button>
          <PropertyImage src={list[Math.min(active, list.length - 1)]} alt={title} eager className="max-h-[90dvh] w-auto rounded-xl" />
          {images.length > 1 && (
            <div className="absolute bottom-4 flex gap-2">
              {list.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Image ${i + 1}`}
                  className={cn("h-2.5 rounded-full", active === i ? "w-6 bg-white" : "w-2.5 bg-white/40")}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OwnerCard({ property }: { property: PropertyWithOwner }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOwner = property.owner_id === session?.user?.id;

  async function contactOwner() {
    if (!session) {
      navigate(`/login?from=/property/${property.id}`);
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("create_conversation", {
        property_id: property.id,
      });
      if (rpcError || !data) {
        setError("We couldn't start a conversation. Please try again.");
        return;
      }
      navigate(`/inbox/${data}`);
    } catch {
      setError("We couldn't start a conversation. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  const owner = property.owner;

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-base font-bold text-white">
          {genericInitials(owner?.full_name)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900">{owner?.full_name || "Property owner"}</p>
          <div className="flex items-center gap-1.5">
            {owner?.verification_status === "verified" ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
                <span className="text-xs font-medium text-brand-700">Verified owner</span>
              </>
            ) : (
              <span className="text-xs text-ink-500">Member of RentHub</span>
            )}
          </div>
        </div>
      </div>

      {!isOwner && (
        <div className="mt-4 grid gap-2">
          <Button size="lg" loading={starting} onClick={() => void contactOwner()}>
            <MessageCircle className="h-4 w-4" />
            Contact Owner
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
      {isOwner && (
        <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2.5 text-sm text-brand-800">
          This is your listing.{" "}
          <Link to={`/dashboard/properties/${property.id}/edit`} className="font-medium underline">
            Edit it
          </Link>{" "}
          or view it in your{" "}
          <Link to="/dashboard/properties" className="font-medium underline">
            dashboard
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function ScheduleVisitModal({
  property,
  open,
  onClose,
}: {
  property: PropertyWithOwner;
  open: boolean;
  onClose: () => void;
}) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("10:00");
  const [guests, setGuests] = useState("1");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<VisitStatus | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setDone(null);
      setDate(todayISO());
      setTime("10:00");
      setGuests("1");
      setMessage("");
    }
  }, [open]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) {
      navigate(`/login?from=/property/${property.id}`);
      return;
    }
    if (!date || !time) {
      setError("Please pick a date and time for your visit.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from("visit_requests").insert({
      property_id: property.id,
      requester_id: session.user.id,
      visit_date: date,
      visit_time: time,
      guests: Math.min(Math.max(parseInt(guests, 10) || 1, 1), 20),
      message: message.trim() || null,
    });
    setSubmitting(false);
    if (insertError) {
      setError("We couldn't schedule your visit. Please try again.");
      return;
    }
    setDone("pending");
  }

  if (done) {
    return (
      <Modal open={open} onClose={onClose} title="Visit requested" size="sm">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <CalendarDays className="h-7 w-7" />
          </div>
          <p className="mt-3 text-sm text-ink-600">
            Your visit request for <strong>{formatDate(date)}</strong> at <strong>{time}</strong> was
            sent to the owner. You&apos;ll get a notification once they respond. You can track it
            under <strong>My Visits</strong>.
          </p>
          <div className="mt-5 grid gap-2">
            <Link to="/my-visits" onClick={onClose}>
              <Button fullWidth>View my visits</Button>
            </Link>
            <Button variant="outline" fullWidth onClick={onClose}>
              Continue browsing
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={`Schedule a visit — ${property.title}`} size="sm">
      <form onSubmit={onSubmit} className="grid gap-4">
        {!session && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            You&apos;ll need to sign in first to schedule a visit.
          </p>
        )}
        <Input
          type="date"
          label="Preferred date"
          min={todayISO()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <Input
          type="time"
          label="Preferred time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
        />
        <Input
          type="number"
          label="Number of visitors"
          min={1}
          max={20}
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
          required
        />
        <Textarea
          label="Message for the owner (optional)"
          placeholder="e.g. I'm interested in the 2-bed layout and would like to see the neighbourhood too."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" loading={submitting}>
          <CalendarDays className="h-4 w-4" />
          Request visit
        </Button>
        <p className="text-center text-xs text-ink-500">
          The owner confirms the time before your visit. No advance money is ever needed.
        </p>
      </form>
    </Modal>
  );
}

function ReportModal({
  property,
  open,
  onClose,
}: {
  property: PropertyWithOwner;
  open: boolean;
  onClose: () => void;
}) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setDetails("");
      setError(null);
      setDone(false);
    }
  }, [open]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) {
      navigate(`/login?from=/property/${property.id}`);
      return;
    }
    if (!reason) {
      setError("Please choose a reason for the report.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from("reports").insert({
      reporter_id: session.user.id,
      target_type: "property",
      target_id: property.id,
      reason,
      details: details.trim() || null,
    });
    setSubmitting(false);
    if (insertError) {
      setError("We couldn't submit your report. Please try again.");
      return;
    }
    setDone(true);
  }

  return (
    <Modal open={open} onClose={onClose} title="Report this listing" size="sm">
      {done ? (
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Flag className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm text-ink-600">
            Thanks for letting us know. Our team will review this listing. We take every report
            seriously.
          </p>
          <Button className="mt-5" fullWidth onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4">
          <Select
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="">Choose a reason</option>
            {reportReasons.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          <Textarea
            label="More details (optional)"
            placeholder="Tell us anything that will help us review it faster."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" variant="danger" loading={submitting}>
            <Flag className="h-4 w-4" />
            Submit report
          </Button>
        </form>
      )}
    </Modal>
  );
}

export default function PropertyDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { session, loading } = useAuth();
  const { favoriteIds, loaded: favsLoaded, toggleFavorite } = useFavorites();
  const navigate = useNavigate();
  const countedView = useRef(false);

  const [property, setProperty] = useState<PropertyWithOwner | null | undefined>(undefined);
  const [error, setError] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    let active = true;
    setProperty(undefined);
    setError(false);
    if (!id) return;
    getProperty(id)
      .then((p) => {
        if (!active) return;
        setProperty(p);
        if (p && !loading && !countedView.current && p.owner_id !== session?.user?.id && shouldCountView(p.id)) {
          countedView.current = true;
          supabase.rpc("increment_property_view", { property: id }).then(() => {}, () => {});
        }
      })
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [id, loading, session?.user?.id]);

  useEffect(() => {
    if (property) {
      document.title = `${property.title} — RentHub`;
      const meta = document.querySelector('meta[name="description"]');
      meta?.setAttribute("content", `${property.title} in ${property.area}, ${property.city} — ${formatPrice(Number(property.price), property.price_unit)}. Contact the owner on RentHub.`);
    }
    return () => {
      document.title = "RentHub — Find a place you'll love";
    };
  }, [property]);

  if (error) {
    return (
      <div className="container-app py-16 text-center">
        <p className="text-ink-500">We couldn&apos;t load this property. It may no longer be available.</p>
        <Link to="/search" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
          Browse other properties
        </Link>
      </div>
    );
  }

  if (property === undefined) {
    return (
      <div className="container-app py-6">
        <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (property === null) {
    return (
      <div className="container-app py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink-100 text-ink-400">
          <Building2 className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-ink-900">This listing isn&apos;t available</h1>
        <p className="mt-1 text-sm text-ink-500">
          It may have been removed, sold, or the listing may have expired.
        </p>
        <Link to="/search" className="mt-4 inline-block">
          <Button>Browse other properties</Button>
        </Link>
      </div>
    );
  }

  const isOwner = property.owner_id === session?.user?.id;
  const isFav = favsLoaded && favoriteIds.has(property.id);
  const displayPrice = formatPrice(Number(property.price), property.price_unit);

  return (
    <div className="container-app py-6">
      {/* Top actions */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-sm text-ink-500">
          <Link to="/" className="hover:text-brand-600">Home</Link>
          <MoveRight className="h-3.5 w-3.5" />
          <Link to={`/search?city=${encodeURIComponent(property.city)}`} className="hover:text-brand-600">
            {property.city}
          </Link>
          <MoveRight className="h-3.5 w-3.5" />
          <span className="text-ink-800">{property.area}</span>
        </div>
        {session && !isOwner && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const ok = await copyText(window.location.href);
                setShared(ok);
                setTimeout(() => setShared(false), 2000);
              }}
            >
              <Share2 className="h-4 w-4" />
              {shared ? "Link copied!" : "Share"}
            </Button>
            <Button variant="danger-outline" size="sm" onClick={() => setReportOpen(true)}>
              <Flag className="h-4 w-4" />
              Report
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="min-w-0 lg:col-span-2">
          <Gallery images={property.images ?? []} title={property.title} />

          <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="blue">{listingTypeLabels[property.listing_type]}</Badge>
                <Badge tone="ink">{propertyTypeLabels[property.property_type]}</Badge>
                {property.verification_status === "verified" ? (
                  <Badge tone="green">
                    <ShieldCheck className="h-3 w-3" /> Verified listing
                  </Badge>
                ) : (
                  <Badge tone="gray">
                    <Sparkles className="h-3 w-3" /> Review in progress
                  </Badge>
                )}
              </div>
              <h1 className="mt-2 text-2xl font-bold text-ink-900 sm:text-3xl">{property.title}</h1>
              <p className="mt-1.5 flex items-center gap-1 text-sm text-ink-500">
                <MapPin className="h-4 w-4" />
                {property.area}, {property.city}
                {property.address ? ` — ${property.address}` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-brand-700 sm:text-3xl">{displayPrice}</p>
              <p className="text-xs text-ink-500">
                {property.listing_type === "rent" ? "monthly" : "one-time"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-ink-500">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" /> Listed {timeAgo(property.created_at)}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" /> {property.views_count} views
            </span>
            <span className="flex items-center gap-1.5">
              <Heart className="h-4 w-4" /> {property.favorites_count} saved
            </span>
          </div>

          {/* Mobile action bar */}
          <div className="mt-5 grid grid-cols-2 gap-3 lg:hidden">
            <Button size="md" onClick={() => setVisitOpen(true)}>
              <CalendarDays className="h-4 w-4" />
              Visit
            </Button>
            {!isOwner && (
              <Button
                size="md"
                variant={isFav ? "secondary" : "brand-soft"}
                onClick={async () => {
                  const ok = await toggleFavorite(property.id);
                  if (!ok && !session) navigate(`/login?from=/property/${property.id}`);
                }}
              >
                <Heart className={cn("h-4 w-4", isFav && "fill-red-500 text-red-500")} />
                {isFav ? "Saved" : "Save"}
              </Button>
            )}
          </div>

          {/* Description */}
          <section className="mt-8">
            <h2 className="text-lg font-bold text-ink-900">Description</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-700">
              {property.description || "The owner hasn't added a description yet. Use the chat to ask them anything."}
            </p>
          </section>

          {/* Specs */}
          <section className="mt-8">
            <h2 className="text-lg font-bold text-ink-900">Property details</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {property.property_type && (
                <div className="rounded-xl border border-ink-200 bg-white p-3.5">
                  <dt className="text-xs font-medium text-ink-500">Type</dt>
                  <dd className="mt-0.5 flex items-center gap-1.5 font-semibold text-ink-900">
                    <Home className="h-4 w-4 text-brand-600" /> {propertyTypeLabels[property.property_type]}
                  </dd>
                </div>
              )}
              {property.bedrooms != null && (
                <div className="rounded-xl border border-ink-200 bg-white p-3.5">
                  <dt className="text-xs font-medium text-ink-500">Bedrooms</dt>
                  <dd className="mt-0.5 flex items-center gap-1.5 font-semibold text-ink-900">
                    <BedDouble className="h-4 w-4 text-brand-600" /> {property.bedrooms}
                  </dd>
                </div>
              )}
              {property.bathrooms != null && (
                <div className="rounded-xl border border-ink-200 bg-white p-3.5">
                  <dt className="text-xs font-medium text-ink-500">Bathrooms</dt>
                  <dd className="mt-0.5 flex items-center gap-1.5 font-semibold text-ink-900">
                    <Bath className="h-4 w-4 text-brand-600" /> {property.bathrooms}
                  </dd>
                </div>
              )}
              {property.area_size != null && (
                <div className="rounded-xl border border-ink-200 bg-white p-3.5">
                  <dt className="text-xs font-medium text-ink-500">Area</dt>
                  <dd className="mt-0.5 flex items-center gap-1.5 font-semibold text-ink-900">
                    <Maximize className="h-4 w-4 text-brand-600" /> {formatArea(property.area_size, property.area_unit)}
                  </dd>
                </div>
              )}
              <div className="rounded-xl border border-ink-200 bg-white p-3.5">
                <dt className="text-xs font-medium text-ink-500">Price</dt>
                <dd className="mt-0.5 font-semibold text-ink-900">
                  {displayPrice}
                  <span className="ml-1 text-xs font-normal text-ink-500">{priceUnitLabels[property.price_unit]}</span>
                </dd>
              </div>
              <div className="rounded-xl border border-ink-200 bg-white p-3.5">
                <dt className="text-xs font-medium text-ink-500">Furnished</dt>
                <dd className="mt-0.5 font-semibold text-ink-900">
                  {property.furnished == null ? "—" : property.furnished ? "Yes" : "No"}
                </dd>
              </div>
              {property.video_url && (
                <div className="col-span-2 rounded-xl border border-ink-200 bg-white p-3.5 sm:col-span-3">
                  <video src={property.video_url} controls preload="metadata" className="aspect-video w-full rounded-lg bg-ink-100" />
                </div>
              )}
            </dl>
          </section>

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-bold text-ink-900">Amenities</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {property.amenities.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-700">
                    <BadgeCheck className="h-4 w-4 text-brand-600" />
                    {a}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="hidden lg:block">
            <Button size="lg" fullWidth onClick={() => setVisitOpen(true)}>
              <CalendarDays className="h-4 w-4" />
              Schedule a Visit
            </Button>
            {!isOwner && (
              <Button
                variant="brand-soft"
                size="lg"
                fullWidth
                className="mt-2"
                onClick={async () => {
                  const ok = await toggleFavorite(property!.id);
                  if (!ok && !session) navigate(`/login?from=/property/${property.id}`);
                }}
              >
                <Heart className={cn("h-4 w-4", isFav && "fill-red-500 text-red-500")} />
                {isFav ? "Saved" : "Save to favorites"}
              </Button>
            )}
          </div>

          <OwnerCard property={property} />

          <div className="rounded-2xl border border-ink-200 bg-white p-5 text-sm text-ink-600">
            <p className="font-semibold text-ink-900">Stay safe</p>
            <ul className="mt-2 space-y-1.5">
              <li>• Always view the property before paying anything.</li>
              <li>• Never send advance money to a stranger.</li>
              <li>• Keep chats on RentHub so there&apos;s a record.</li>
              <li>
                • Something off?{" "}
                <button type="button" className="font-medium text-brand-600 hover:underline" onClick={() => setReportOpen(true)}>
                  Report it
                </button>
                .
              </li>
            </ul>
          </div>

          <p className="px-1 text-xs text-ink-400">
            Last updated {formatDate(property.updated_at)}
          </p>
        </aside>
      </div>

      <ScheduleVisitModal property={property} open={visitOpen} onClose={() => setVisitOpen(false)} />
      <ReportModal property={property} open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}