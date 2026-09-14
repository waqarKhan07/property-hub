import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthShell } from "@/pages/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BackendGate } from "@/components/auth/BackendGate";
import { supabase } from "@/lib/supabase";
import { describeAuthError } from "@/lib/authErrors";
import { config } from "@/config/config";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function ForgotPasswordPage() {
  useDocumentTitle("Reset password — RentHub");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("That doesn't look like a valid email address.");
      return;
    }
    setSubmitting(true);
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${config.appUrl}/reset-password`,
    });
    setSubmitting(false);
    if (authError) {
      setError(describeAuthError(authError, "We couldn't send a reset link. Please check the email and try again."));
      return;
    }
    setSent(true);
  }

  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a secure link to set a new password.">
      {sent ? (
        <div className="grid gap-4">
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
            Check your inbox. If an account exists for that email, a reset link is on its way.
          </p>
          <Link to="/login">
            <Button variant="outline" fullWidth>
              Back to sign in
            </Button>
          </Link>
        </div>
      ) : (
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
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" loading={submitting} fullWidth>
              Send reset link
            </Button>
            <p className="text-center text-sm text-ink-600">
              Remembered it?{" "}
              <Link to="/login" className="font-medium text-brand-600 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </BackendGate>
      )}
    </AuthShell>
  );
}