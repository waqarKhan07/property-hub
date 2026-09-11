import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-ink-200 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}