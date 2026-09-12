import { useEffect, useState, type FormEvent } from "react";
import { BadgeCheck, Camera, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { initials } from "@/lib/utils";
import { verificationBadgeLabel } from "@/lib/constants";
import type { VerificationStatus } from "@/types";

const toneByStatus: Record<VerificationStatus, "gray" | "green" | "amber" | "red"> = {
  unverified: "gray",
  pending: "amber",
  verified: "green",
  rejected: "red",
  suspended: "red",
};

export default function ProfilePage() {
  useDocumentTitle("My profile — RentHub");
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reqVerification, setReqVerification] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setBio(profile?.bio ?? "");
  }, [profile]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    const { error: err } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() || null, bio: bio.trim() || null })
      .eq("id", user?.id ?? "");
    setSaving(false);
    if (err) {
      setError("We couldn't save your profile. Please try again.");
      return;
    }
    setMessage("Profile saved.");
    await refreshProfile();
  }

  async function requestOwnerVerification() {
    if (!user) return;
    setReqVerification(true);
    const { error: err } = await supabase.from("verification_requests").insert({
      user_id: user.id,
      type: "owner",
      documents: { via: "profile" },
    });
    setReqVerification(false);
    setMessage(!err ? "Verification request submitted. We'll notify you once reviewed." : "We couldn't submit your request. Please try again.");
  }

  return (
    <div className="container-app py-8">
      <div className="grid gap-3 lg:grid-cols-[240px_1fr] lg:gap-6">
        <aside className="rounded-2xl border border-ink-200 bg-white p-4">
          <DashboardNav active="/dashboard/profile" />
        </aside>

        <div className="min-w-0 max-w-xl">
          <h1 className="text-2xl font-bold text-ink-900">Profile</h1>

          <Card className="mt-6 p-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-xl font-bold text-white">
                  {initials(fullName)}
                </div>
                {profile?.avatar_url && (
                  <img src={profile.avatar_url} alt="" className="absolute inset-0 h-16 w-16 rounded-full object-cover" />
                )}
              </div>
              <div>
                <p className="text-base font-semibold text-ink-900">{profile?.email}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge tone="blue">{profile?.role}</Badge>
                  <Badge tone={toneByStatus[profile?.verification_status ?? "unverified"]}>
                    {profile?.verification_status === "verified" && <BadgeCheck className="h-3 w-3" />}
                    {verificationBadgeLabel[profile?.verification_status ?? "unverified"]}
                  </Badge>
                </div>
              </div>
            </div>

            {(profile?.role !== "owner" && profile?.role !== "admin") && (
              <div className="mt-4 rounded-lg bg-brand-50 px-3 py-2.5 text-sm text-brand-900">
                You&apos;re currently a <strong>member</strong>. Become an owner to list properties —
                it&apos;s free.
              </div>
            )}

            <form onSubmit={save} className="mt-5 grid gap-4">
              <Input
                label="Full name"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Textarea
                label="Short bio (optional)"
                rows={3}
                placeholder="e.g. Helping families find homes in Lahore. Reach out about my listings any time."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
              {error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
              {message && (
                <p role="status" className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
                  {message}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" loading={saving}>
                  Save changes
                </Button>
                {profile?.verification_status === "unverified" ||
                profile?.verification_status === "rejected" ? (
                  <Button variant="brand-soft" loading={reqVerification} onClick={() => void requestOwnerVerification()}>
                    <ShieldCheck className="h-4 w-4" /> Request account verification
                  </Button>
                ) : null}
              </div>
            </form>
          </Card>

          <p className="mt-4 flex items-center gap-2 text-xs text-ink-400">
            <Camera className="h-4 w-4" /> Avatar photos aren&apos;t enabled yet in this build.
          </p>
        </div>
      </div>
    </div>
  );
}