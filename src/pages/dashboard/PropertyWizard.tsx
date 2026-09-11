import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ImagePlus,
  Info,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";
import { SetupNotice } from "@/components/SetupNotice";
import { needsSetupBlock } from "@/lib/setup";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  cities,
  cityNames,
  amenityOptions,
  areaUnits,
  propertyTypeLabels,
  propertyTypesByListing,
  priceUnitLabels,
} from "@/lib/constants";
import { cn, formatCompactPrice } from "@/lib/utils";
import { uploadPropertyImage, deletePropertyImage, storagePathFromPublicUrl } from "@/lib/uploadImage";
import type { ListingType, PricePerUnit, Property, PropertyAreaUnit, PropertyType } from "@/types";

export interface WizardData {
  listing_type: ListingType;
  property_type: PropertyType;
  title: string;
  city: string;
  area: string;
  address: string;
  price: string;
  price_unit: PricePerUnit;
  bedrooms: string;
  bathrooms: string;
  area_size: string;
  area_unit: PropertyAreaUnit;
  furnished: "any" | "yes" | "no";
  amenities: string[];
  images: string[];
  video_url: string;
  description: string;
  contact_name: string;
  contact_phone: string;
}

const defaultData: WizardData = {
  listing_type: "rent",
  property_type: "apartment",
  title: "",
  city: "",
  area: "",
  address: "",
  price: "",
  price_unit: "monthly",
  bedrooms: "",
  bathrooms: "",
  area_size: "",
  area_unit: "marla",
  furnished: "any",
  amenities: [],
  images: [],
  video_url: "",
  description: "",
  contact_name: "",
  contact_phone: "",
};

const schemas: z.ZodType<Partial<WizardData>>[] = [
  z.object({ listing_type: z.enum(["rent", "sale"]), property_type: z.enum(["house", "apartment", "portion", "room", "plot", "shop", "office", "warehouse"]), title: z.string().trim().min(4, "Please add a clear title (at least 4 characters).").max(120) }),
  z.object({ city: z.string().trim().min(2, "Please choose a city."), area: z.string().trim().min(2, "Please choose an area."), address: z.string().max(300).optional() }),
  z.object({ price: z.string().regex(/^\d{1,9}$/, "Price must be a number, e.g. 60000."), price_unit: z.enum(["monthly", "yearly", "total"]) }),
  z.object({
    bedrooms: z.string().regex(/^\d{0,2}$/, "Bedrooms must be a number.").optional(),
    bathrooms: z.string().regex(/^\d{0,2}$/, "Bathrooms must be a number.").optional(),
    area_size: z.string().regex(/^\d{0,10}(\.\d{0,2})?$/, "Area must be a number.").optional(),
    area_unit: z.enum(["marla", "kanal", "sqft", "sqm"]),
  }),
  z.object({ amenities: z.array(z.string()).max(50) }),
  z.object({ images: z.array(z.string()).min(1, "Add at least one photo — listings with photos get far more interest.").max(15), video_url: z.string().url().or(z.literal("")).optional() }),
  z.object({ description: z.string().min(20, "Add a short description (at least 20 characters).") }),
  z.object({}),
];

const steps = [
  { label: "Basic info", icon: Pencil },
  { label: "Location", icon: MapPin },
  { label: "Pricing", icon: Star },
  { label: "Specs", icon: Package },
  { label: "Amenities", icon: Check },
  { label: "Photos", icon: ImagePlus },
  { label: "Description", icon: Info },
  { label: "Review", icon: CheckCircle2 },
];

function validateStep(step: number, data: WizardData): string | null {
  const schema = schemas[step];
  if (!schema) return null;
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    return issue?.message ?? "Please fix the highlighted fields and continue.";
  }
  return null;
}

export function PropertyWizard({
  propertyId,
  onCancel,
}: {
  propertyId?: string;
  onCancel: () => void;
}) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const editing = Boolean(propertyId);

  const [data, setData] = useState<WizardData>(defaultData);
  const [step, setStep] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(propertyId ?? null);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState<string | null>(null);
  const [continueMsg, setContinueMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  // Load existing property in edit mode
  useEffect(() => {
    if (!propertyId || !user) return;
    let active = true;
    supabase
      .from("properties")
      .select("*")
      .eq("id", propertyId)
      .eq("owner_id", user.id)
      .maybeSingle()
      .then(({ data: prop, error: err }) => {
        if (!active) return;
        if (err || !prop) {
          setError("This listing isn't available to edit.");
          setLoading(false);
          return;
        }
        const p = prop as Property;
        setData({
          listing_type: p.listing_type,
          property_type: p.property_type,
          title: p.title,
          city: p.city,
          area: p.area,
          address: p.address ?? "",
          price: String(Number(p.price)),
          price_unit: p.price_unit,
          bedrooms: p.bedrooms != null ? String(p.bedrooms) : "",
          bathrooms: p.bathrooms != null ? String(p.bathrooms) : "",
          area_size: p.area_size != null ? String(p.area_size) : "",
          area_unit: p.area_unit ?? "marla",
          furnished: p.furnished == null ? "any" : p.furnished ? "yes" : "no",
          amenities: p.amenities ?? [],
          images: p.images ?? [],
          video_url: p.video_url ?? "",
          description: p.description ?? "",
          contact_name: p.contact_name ?? "",
          contact_phone: p.contact_phone ?? "",
        });
        setDraftId(p.id);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [propertyId, user]);

  const update = (patch: Partial<WizardData>) => setData((d) => ({ ...d, ...patch }));

  const areaOptions = useMemo(() => {
    if (!data.city) return [];
    return cities.find((c) => c.city === data.city)?.areas ?? [];
  }, [data.city]);

  // Persist current data to the (draft) property row.
  const persist = useCallback(
    async (id: string) => {
      if (!user) return;
      const { error: err } = await supabase
        .from("properties")
        .update({
          listing_type: data.listing_type,
          property_type: data.property_type,
          title: data.title.trim(),
          city: data.city,
          area: data.area,
          address: data.address.trim() || null,
          price: Number(data.price) || 0,
          price_unit: data.price_unit,
          bedrooms: data.bedrooms ? Number(data.bedrooms) : null,
          bathrooms: data.bathrooms ? Number(data.bathrooms) : null,
          area_size: data.area_size ? Number(data.area_size) : null,
          area_unit: data.area_unit,
          furnished: data.furnished === "any" ? null : data.furnished === "yes",
          amenities: data.amenities,
          images: data.images,
          video_url: data.video_url.trim() || null,
          description: data.description,
          contact_name: data.contact_name.trim() || null,
          contact_phone: data.contact_phone.trim() || null,
        })
        .eq("id", id);
      if (err) throw err;
    },
    [data, user],
  );

  async function continueToNext() {
    if (!user) {
      setError("Please sign in to continue.");
      return;
    }
    setError(null);
    setContinueMsg(null);
    setSaving(true);
    try {
      let id = draftId;
      if (!id) {
        const { data: insertData, error: insertError } = await supabase
          .from("properties")
          .insert({
            owner_id: user.id,
            listing_type: data.listing_type,
            property_type: data.property_type,
            title: data.title.trim() || "Draft listing",
            description: data.description,
            price: Number(data.price) || 0,
            price_unit: data.price_unit,
            city: data.city || "—",
            area: data.area || "—",
          })
          .select("id")
          .single();
        if (insertError) throw insertError;
        id = insertData.id;
        setDraftId(id);
      }
      await persist(id!);
      setSaving(false);
      setStep((s) => Math.min(s + 1, steps.length - 1));
    } catch {
      setSaving(false);
      setError("We couldn't save your progress. Please try again.");
    }
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!user || !draftId) {
      setError("Please continue through Step 1 first so we can attach photos.");
      return;
    }
    setError(null);
    setUploading(true);
    const all = Array.from(files).slice(0, 15 - data.images.length);
    setUploadProgress({ done: 0, total: all.length });
    const uploaded: string[] = [];
    for (let i = 0; i < all.length; i++) {
      try {
        const url = await uploadPropertyImage(all[i], user.id, draftId, () =>
          setUploadProgress({ done: i + 1, total: all.length }),
        );
        uploaded.push(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "One or more photos failed to upload.");
        break;
      }
    }
    setUploadProgress(null);
    setUploading(false);
    if (uploaded.length > 0) {
      const next = [...data.images, ...uploaded];
      update({ images: next });
      await persist(draftId).catch(() => {});
    }
  }

  async function removeImage(index: number) {
    if (!draftId) return;
    const removed = data.images[index];
    const next = data.images.filter((_, i) => i !== index);
    update({ images: next });
    await persist(draftId).catch(() => {});
    if (removed) {
      await deletePropertyImage(storagePathFromPublicUrl(removed)).catch(() => {});
    }
  }

  async function moveImage(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= data.images.length) return;
    const next = [...data.images];
    [next[index], next[target]] = [next[target], next[index]];
    update({ images: next });
    if (draftId) await persist(draftId).catch(() => {});
  }

  async function publish() {
    if (!draftId) {
      setError("We couldn't find the draft for this listing. Please go back a step.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await persist(draftId);
      if (draftId) {
        const { error: pubError } = await supabase.rpc("publish_property", { property: draftId });
        if (pubError) throw pubError;
      }
      navigate(`/property/${draftId}`);
    } catch {
      setSaving(false);
      setError("We couldn't publish your listing. Please make sure the form is complete and try again.");
    }
  }

  async function saveEdits() {
    if (!draftId) return;
    setSaving(true);
    setError(null);
    try {
      await persist(draftId);
      navigate("/dashboard/properties");
    } catch {
      setSaving(false);
      setError("We couldn't save your changes. Please try again.");
    }
  }

  if (needsSetupBlock()) {
    return (
      <div className="container-app py-10">
        <SetupNotice />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-app flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  if (error && !data.title && editing && !draftId) {
    return (
      <div className="container-app py-10 text-center">
        <p className="text-ink-500">{error}</p>
        <Button className="mt-4" variant="outline" onClick={onCancel}>
          Back to my properties
        </Button>
      </div>
    );
  }

  const pricePreview = data.price ? formatCompactPrice(Number(data.price)) : "Not set";

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Step indicator */}
      <ol className="no-scrollbar flex items-center gap-1 overflow-x-auto py-1" aria-label="Progress">
        {steps.map((s, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={s.label} className="flex shrink-0 items-center gap-1">
              <span
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold",
                  done && "bg-brand-600 text-white",
                  current && "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-300",
                  !done && !current && "bg-ink-100 text-ink-400",
                )}
                aria-current={current ? "step" : undefined}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : <span className="tabular-nums">{i + 1}</span>}
                <span className="hidden sm:inline">{s.label}</span>
              </span>
              {i < steps.length - 1 && <span className="h-px w-3 bg-ink-200" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      <Card className="mt-4 p-5 sm:p-7">
        <h2 className="text-xl font-bold text-ink-900">{steps[step].label}</h2>
        <p className="mt-1 text-sm text-ink-500">
          {editing ? `Editing "${data.title}"` : "Everything saves as you go — you can finish later."}
        </p>

        {step === 0 && (
          <div className="mt-6 grid gap-4">
            <div>
              <p className="mb-2 text-sm font-medium text-ink-800">I want to</p>
              <div className="grid grid-cols-2 gap-2">
                {(["rent", "sale"] as ListingType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update({ listing_type: t, property_type: typesFallback(t) })}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left transition",
                      data.listing_type === t
                        ? "border-brand-500 bg-brand-50 ring-1 ring-brand-300"
                        : "border-ink-200 hover:border-ink-300",
                    )}
                  >
                    <span className="block font-semibold text-ink-900">{t === "rent" ? "Rent out" : "Sell"}</span>
                    <span className="block text-xs text-ink-500">{t === "rent" ? "Monthly/yearly income" : "One-time price"}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-ink-800">Type of property</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {propertyTypesByListing[data.listing_type].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update({ property_type: t })}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-sm font-medium transition",
                      data.property_type === t
                        ? "border-brand-500 bg-brand-50 text-brand-800 ring-1 ring-brand-300"
                        : "border-ink-200 text-ink-700 hover:border-ink-300",
                    )}
                  >
                    {propertyTypeLabels[t]}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="Listing title"
              placeholder="e.g. Brand new 2-bed apartment in DHA Phase 6"
              value={data.title}
              onChange={(e) => update({ title: e.target.value })}
            />
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Select label="City" value={data.city} onChange={(e) => update({ city: e.target.value, area: "" })}>
              <option value="">Choose city</option>
              {cityNames.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select label="Area" value={data.area} onChange={(e) => update({ area: e.target.value })}>
              <option value="">Choose area</option>
              {areaOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
            <Input
              className="sm:col-span-2"
              label="Street address (optional)"
              placeholder="House #12, Street 5, near the main park"
              value={data.address}
              onChange={(e) => update({ address: e.target.value })}
            />
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Input
              label="Price (PKR)"
              inputMode="numeric"
              placeholder={data.listing_type === "rent" ? "e.g. 60000" : "e.g. 45000000"}
              value={data.price}
              onChange={(e) => update({ price: e.target.value.replace(/[^\d]/g, "") })}
            />
            <Select
              label={data.listing_type === "rent" ? "Payment period" : "Price type"}
              value={data.price_unit}
              onChange={(e) => update({ price_unit: e.target.value as PricePerUnit })}
            >
              {data.listing_type === "rent" ? (
                <>
                  <option value="monthly">Per month</option>
                  <option value="yearly">Per year</option>
                </>
              ) : (
                <option value="total">One-time total</option>
              )}
            </Select>
            <div className="rounded-lg bg-ink-50 px-3 py-2.5 text-sm text-ink-600 sm:col-span-2">
              Preview: <strong className="text-ink-900">{pricePreview}</strong>
              {data.listing_type === "rent" && data.price_unit !== "total"
                ? ` — you'd show "PKR ${data.price || "…"}${priceUnitLabels[data.price_unit]}" on the listing`
                : ""}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Input
              label="Bedrooms"
              inputMode="numeric"
              placeholder="e.g. 3"
              value={data.bedrooms}
              onChange={(e) => update({ bedrooms: e.target.value.replace(/[^\d]/g, "").slice(0, 2) })}
            />
            <Input
              label="Bathrooms"
              inputMode="numeric"
              placeholder="e.g. 3"
              value={data.bathrooms}
              onChange={(e) => update({ bathrooms: e.target.value.replace(/[^\d]/g, "").slice(0, 2) })}
            />
            <div className="sm:col-span-3">
              <p className="mb-2 text-sm font-medium text-ink-800">Furnished?</p>
              <div className="grid grid-cols-3 gap-2">
                {(["any", "yes", "no"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => update({ furnished: f })}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-sm font-medium",
                      data.furnished === f
                        ? "border-brand-500 bg-brand-50 text-brand-800 ring-1 ring-brand-300"
                        : "border-ink-200 text-ink-700 hover:border-ink-300",
                    )}
                  >
                    {f === "any" ? "Don't say" : f === "yes" ? "Furnished" : "Unfurnished"}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="Area size"
              inputMode="decimal"
              placeholder="e.g. 5"
              value={data.area_size}
              onChange={(e) => update({ area_size: e.target.value.replace(/[^\d.]/g, "").slice(0, 10) })}
            />
            <Select label="Area unit" value={data.area_unit} onChange={(e) => update({ area_unit: e.target.value as PropertyAreaUnit })}>
              {areaUnits.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </div>
        )}

        {step === 4 && (
          <div className="mt-6">
            <p className="text-sm text-ink-500">Select everything this property has.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {amenityOptions.map((a) => {
                const selected = data.amenities.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() =>
                      update({ amenities: selected ? data.amenities.filter((x) => x !== a) : [...data.amenities, a] })
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition",
                      selected
                        ? "border-brand-500 bg-brand-50 text-brand-800 ring-1 ring-brand-300"
                        : "border-ink-200 text-ink-700 hover:border-ink-300",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border",
                        selected ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300 bg-white",
                      )}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="mt-6">
            <label
              htmlFor="photos"
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-ink-300 bg-ink-50 px-4 py-10 text-center transition hover:border-brand-400 hover:bg-brand-50"
            >
              <ImagePlus className="h-8 w-8 text-brand-600" />
              <p className="mt-2 text-sm font-semibold text-ink-900">Add photos of the property</p>
              <p className="mt-1 text-xs text-ink-500">
                JPEG, PNG, WebP or AVIF · up to 8 MB each · max {Math.max(15 - data.images.length, 0)} more
              </p>
              <span className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">
                {uploading ? "Uploading…" : "Choose photos"}
              </span>
              <input
                id="photos"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  void handleFileUpload(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>

            {uploadProgress && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-ink-500">
                  <span>Uploading {uploadProgress.done}/{uploadProgress.total}</span>
                  <span>{Math.round((uploadProgress.done / Math.max(uploadProgress.total, 1)) * 100)}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-all"
                    style={{ width: `${(uploadProgress.done / Math.max(uploadProgress.total, 1)) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {data.images.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {data.images.map((img, i) => (
                  <div key={img} className="group relative overflow-hidden rounded-xl border border-ink-200">
                    <img src={img} alt={`Photo ${i + 1}`} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-ink-950/0 opacity-0 transition group-hover:bg-ink-950/40 group-hover:opacity-100">
                      <button
                        type="button"
                        aria-label="Move photo left"
                        className="rounded-lg bg-white/90 p-1.5 disabled:opacity-30"
                        disabled={i === 0}
                        onClick={() => void moveImage(i, -1)}
                      >
                        <ArrowLeft className="h-4 w-4 text-ink-800" />
                      </button>
                      <button
                        type="button"
                        aria-label="Move photo right"
                        className="rounded-lg bg-white/90 p-1.5 disabled:opacity-30"
                        disabled={i === data.images.length - 1}
                        onClick={() => void moveImage(i, 1)}
                      >
                        <ArrowRight className="h-4 w-4 text-ink-800" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete photo"
                        className="rounded-lg bg-red-600 p-1.5 text-white"
                        onClick={() => void removeImage(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {i === 0 && (
                      <span className="absolute left-2 top-2 rounded-md bg-ink-950/70 px-2 py-0.5 text-[10px] font-medium text-white">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Input
              className="mt-4"
              label="Video tour URL (optional)"
              placeholder="https://… (YouTube or direct video link)"
              value={data.video_url}
              onChange={(e) => update({ video_url: e.target.value })}
            />
          </div>
        )}

        {step === 6 && (
          <div className="mt-6 grid gap-4">
            <Textarea
              label="Description"
              rows={6}
              placeholder="Describe the property: rooms, condition, nearby facilities, who it's ideal for, and anything else that helps someone decide."
              value={data.description}
              onChange={(e) => update({ description: e.target.value })}
              hint={`${data.description.length} characters — aim for at least 20.`}
            />
            <Input
              label="Contact name shown to buyers/tenants (optional)"
              placeholder={profile?.full_name ?? "Your name"}
              value={data.contact_name}
              onChange={(e) => update({ contact_name: e.target.value })}
            />
            {data.listing_type === "rent" ? (
              <p className="text-xs text-ink-500">
                Tip: you don&apos;t need to share a phone number — people can message you on RentHub.
              </p>
            ) : (
              <p className="text-xs text-ink-500">Keep deals in-app for a safe, recorded process.</p>
            )}
          </div>
        )}

        {step === 7 && (
          <div className="mt-6 space-y-4">
            <ReviewRow label="Purpose" value={data.listing_type === "rent" ? "For Rent" : "For Sale"} />
            <ReviewRow label="Type" value={propertyTypeLabels[data.property_type]} />
            <ReviewRow label="Title" value={data.title} />
            <ReviewRow label="Location" value={data.area ? `${data.area}, ${data.city}` : data.city || "Not set"} />
            <ReviewRow
              label="Price"
              value={`${formatCompactPrice(Number(data.price || 0))}${data.listing_type === "rent" ? ` ${priceUnitLabels[data.price_unit]} ` : ""}`}
            />
            <ReviewRow
              label="Specs"
              value={[
                data.bedrooms ? `${data.bedrooms} bed` : "",
                data.bathrooms ? `${data.bathrooms} bath` : "",
                data.area_size ? `${data.area_size} ${data.area_unit}` : "",
                data.furnished !== "any" ? (data.furnished === "yes" ? "Furnished" : "Unfurnished") : "",
              ]
                .filter(Boolean)
                .join(" · ") || "Not specified"}
            />
            <ReviewRow
              label="Amenities"
              value={data.amenities.length > 0 ? data.amenities.slice(0, 6).join(", ") + (data.amenities.length > 6 ? ` +${data.amenities.length - 6} more` : "") : "None selected"}
            />
            <ReviewRow label="Photos" value={`${data.images.length} photo${data.images.length === 1 ? "" : "s"}`} />
            <ReviewRow label="Owner contact" value={data.contact_name || profile?.full_name || "Your account name"} />

            <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Once published, your listing goes live immediately and can be seen by everyone. You can
              pause or edit it any time from your dashboard.
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {continueMsg && (
          <p role="status" className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
            {continueMsg}
          </p>
        )}

        {/* Footer controls */}
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="ghost" onClick={step === 0 ? onCancel : () => setStep((s) => s - 1)}>
            <ArrowLeft className="h-4 w-4" />
            {step === 0 ? (editing ? "Discard changes" : "Cancel") : "Back"}
          </Button>

          <div className="flex gap-2">
            {step < steps.length - 1 && (
              <Button
                onClick={async () => {
                  const validationError = validateStep(step, data);
                  if (validationError) {
                    setError(validationError);
                    return;
                  }
                  setError(null);
                  await continueToNext();
                }}
                loading={saving}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {step === steps.length - 1 && (
              <Button
                onClick={() => {
                  const validationError = validateStep(0, data) ?? validateStep(1, data) ?? validateStep(2, data) ?? validateStep(5, data) ?? validateStep(6, data);
                  if (validationError) {
                    setError(validationError);
                    return;
                  }
                  if (editing) void saveEdits();
                  else void publish();
                }}
                loading={saving}
                size="lg"
              >
                <CheckCircle2 className="h-4 w-4" />
                {editing ? "Save changes" : "Publish listing"}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function typesFallback(listingType: ListingType): PropertyType {
  return propertyTypesByListing[listingType][0];
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-100 pb-3">
      <dt className="text-sm font-medium text-ink-500">{label}</dt>
      <dd className="text-right text-sm font-semibold text-ink-900">{value || "—"}</dd>
    </div>
  );
}