import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo className="!flex-col !gap-1 text-center" showText={false} />
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-sm text-ink-600">{footer}</div>}
      </div>
    </div>
  );
}

export function AuthFooterText() {
  return (
    <p className="text-sm text-ink-500">
      By continuing you agree to use RentHub responsibly. Listing is free for owners.
      <br />
      <Link to="/help" className="text-brand-600 hover:underline">
        Learn how RentHub protects you
      </Link>
    </p>
  );
}