import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { AuthShell, AuthFooterText } from "@/pages/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SetupNotice } from "@/components/SetupNotice";
import { needsSetupBlock } from "@/lib/setup";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { config } from "@/config/config";

export default function RegisterPage() {
  const { session } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session) return <Navigate to={from} replace />;

  if (needsSetupBlock()) {
    return (
      <AuthShell title="Create your free account" footer={<AuthFooterText />}>
        <SetupNotice />
      </AuthShell>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (password.length < 8) {
      setError("Your password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim() || null },
        emailRedirectTo: `${config.appUrl}/dashboard`,
      },
    });
    setSubmitting(false);
    if (authError) {
      setError("We couldn't create your account. Please try again.");
      return;
    }
    if (!data.session) {
      setNotice("Almost done! Check your email and click the confirmation link to activate your account.");
    }
  }

  return (
    <AuthShell title="Create your free account" subtitle="Find homes, message owners and schedule visits." footer={<AuthFooterText />}>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <Input
          label="Full name (optional)"
          placeholder="Ahmed Khan"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <Input
          type="email"
          label="Email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          label="Password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Use at least 8 characters."
          required
        />
        <Input
          type="password"
          label="Confirm password"
          placeholder="Repeat your password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
            {notice}
          </p>
        )}
        <Button type="submit" size="lg" loading={submitting} fullWidth>
          Create account
        </Button>
        <p className="text-center text-sm text-ink-600">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}