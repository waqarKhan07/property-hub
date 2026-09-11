import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthShell } from "@/pages/auth/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SetupNotice } from "@/components/SetupNotice";
import { needsSetupBlock } from "@/lib/setup";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session));
    });
  }, []);

  if (needsSetupBlock()) {
    return (
      <AuthShell title="Choose a new password">
        <SetupNotice />
      </AuthShell>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Your password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError("We couldn't update your password. Please try again.");
      return;
    }
    setDone(true);
    await supabase.auth.signOut();
  }

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You can now sign in with your new password.">
        <Link to="/login">
          <Button fullWidth>Continue to sign in</Button>
        </Link>
      </AuthShell>
    );
  }

  if (!ready) {
    return (
      <AuthShell title="Choose a new password">
        <p className="text-sm text-ink-500">
          This link is only valid right after you open it from your email.{" "}
          <Link to="/forgot-password" className="text-brand-600 hover:underline">
            Request a new reset link
          </Link>
          .
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Pick something strong that you haven't used before.">
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <Input
          type="password"
          label="New password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Input
          type="password"
          label="Confirm new password"
          placeholder="Repeat your new password"
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
        <Button type="submit" size="lg" loading={submitting} fullWidth>
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}