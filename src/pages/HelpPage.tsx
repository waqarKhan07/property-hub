import {
  CalendarDays,
  Flag,
  Heart,
  MessageCircle,
  ShieldCheck,
  UserX,
} from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const rules: { title: string; icon: typeof ShieldCheck; text: string }[] = [
  {
    title: "Never pay before viewing",
    icon: Flag,
    text: "A genuine owner will never ask for an advance or token money before you've visited the property in person.",
  },
  {
    title: "Avoid sharing one-time passwords (OTPs)",
    icon: UserX,
    text: "No legitimate listing ever needs your OTP, bank PIN, or CVV. Anyone asking is trying to defraud you.",
  },
  {
    title: "Keep chats on RentHub",
    icon: MessageCircle,
    text: "Stay inside our chat until you've verified the owner. On-platform messages give you a record and faster support.",
  },
  {
    title: "Check the property documents",
    icon: ShieldCheck,
    text: "For sale deals, ask for ownership documents and verify them. RentHub is a marketplace — deals are between you and the owner.",
  },
  {
    title: "Visit in daylight, with someone you trust",
    icon: CalendarDays,
    text: "Prefer daytime visits. Let someone know where you're going. Our in-app visit scheduling records the request on both sides.",
  },
  {
    title: "Report suspicious listings",
    icon: Flag,
    text: "Too good to be true? Prices far below market, or pressure to pay fast? Report the listing and we'll review it.",
  },
];

export default function HelpPage() {
  useDocumentTitle("Help & safety — RentHub");
  return (
    <div className="container-app py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-ink-900">Safety guide</h1>
        <p className="mt-2 text-ink-600">
          RentHub makes it easy to find a place you&apos;ll love — but as with any marketplace, please
          stay alert and follow these golden rules.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {rules.map((r) => (
            <div key={r.title} className="rounded-2xl border border-ink-200 bg-white p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <r.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-3 font-semibold text-ink-900">{r.title}</h2>
              <p className="mt-1 text-sm text-ink-600">{r.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl bg-brand-50 p-6">
          <div className="flex items-start gap-3">
            <Heart className="mt-0.5 h-6 w-6 shrink-0 text-brand-600" />
            <div>
              <h2 className="font-semibold text-brand-900">What RentHub does for your safety</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-900">
                <li>Accounts and listings go through defined verification levels.</li>
                <li>Every report is reviewed by our team.</li>
                <li>Visit requests are recorded with date, time and visitor count.</li>
                <li>Suspicious pricing, duplicate listings and invalid data are flagged.</li>
              </ul>
              <p className="mt-3 text-sm text-brand-800">
                We reduce risk — we can&apos;t eliminate it. Verdict on any deal always stays with you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}