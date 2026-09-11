import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthShell } from "@/pages/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SetupNotice } from "@/components/SetupNotice";
import { needsSetupBlock } from "@/lib/setup";
import { supabase } from "@/lib/supabase";
import { config } from "@/config/config";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (needsSetupBlock()) {
    return (
      <AuthShell title="Reset your password">
        <SetupNotice />
      </AuthShell>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    setSubmitting(true);
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${config.appUrl}/reset-password`,
    });
    setSubmitting(false);
    if (authError) {
      setError("We couldn't send a reset link. Please check the email and try again.");
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
      )}
    </AuthShell>
  );
}