import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, id, children, ...props }, ref) => {
    const autoId = useId();
    const selectId = id ?? autoId;
    return (
      <div className={cn("w-full", className)}>
        {label && (
          <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-ink-800">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={Boolean(error)}
            className={cn(
              "w-full appearance-none rounded-lg border border-ink-300 bg-white px-3.5 py-2.5 pr-9 text-sm text-ink-900 transition-colors",
              "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:bg-ink-100",
              error && "border-red-400 focus:border-red-500 focus:ring-red-500/30",
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        </div>
        {error ? (
          <p role="alert" className="mt-1.5 text-sm text-red-600">
            {error}
          </p>
        ) : hint ? (
          <p className="mt-1.5 text-sm text-ink-500">{hint}</p>
        ) : null}
      </div>
    );
  },
);
Select.displayName = "Select";