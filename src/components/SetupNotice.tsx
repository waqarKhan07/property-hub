import { Database } from "lucide-react";

export function SetupNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <Database className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">RentHub is ready — just needs a database connection.</p>
        <p className="mt-1">
          Create a free project at <span className="font-medium">supabase.com</span>, run the
          migrations in <code className="rounded bg-amber-100 px-1">supabase/migrations/</code>, then
          add <code className="rounded bg-amber-100 px-1">VITE_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-amber-100 px-1">VITE_SUPABASE_ANON_KEY</code> to your{" "}
          <code className="rounded bg-amber-100 px-1">.env</code> file. See the README.
        </p>
      </div>
    </div>
  );
}