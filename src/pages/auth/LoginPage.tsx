import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { AuthShell, AuthFooterText } from "@/pages/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/Button";
import { BackendGate } from "@/components/auth/BackendGate";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { supabase } from "@/lib/supabase";
import { describeAuthError } from "@/lib/authErrors";

export default function LoginPage() {
  useDocumentTitle("Log in — RentHub");
  const { session } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session) return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setSubmitting(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (authError) {
      setError(describeAuthError(authError, "We couldn't sign you in. Please check your email and password."));
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your saved homes, messages and visits." footer={<AuthFooterText />}>
      <BackendGate>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <Input
            type="email"
            label="Email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <PasswordField
            label="Password"
            placeholder="Your password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" loading={submitting} fullWidth>
            Sign in
          </Button>
          <p className="text-center text-sm text-ink-600">
            New to RentHub?{" "}
            <Link to="/register" className="font-medium text-brand-600 hover:underline">
              Create a free account
            </Link>
          </p>
        </form>
      </BackendGate>
    </AuthShell>
  );
}