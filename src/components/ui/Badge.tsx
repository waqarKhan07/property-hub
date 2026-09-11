import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "brand" | "ink" | "green" | "amber" | "red" | "gray" | "blue";

const toneClasses: Record<BadgeTone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  ink: "bg-ink-100 text-ink-700 ring-ink-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  gray: "bg-ink-50 text-ink-500 ring-ink-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
};

export function Badge({
  tone = "ink",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}