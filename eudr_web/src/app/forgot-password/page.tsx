"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AuthShell from "@/components/AuthShell";
import { Button, ErrorBox, Field, Input } from "@/components/kit";
import { api } from "@/lib/api";

function ForgotForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent)
    return (
      <div className="space-y-5">
        <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <MailCheck className="h-5 w-5 flex-none text-emerald-600" />
          <div>
            <p className="font-semibold">Check your inbox</p>
            <p className="mt-1 text-emerald-800/90">
              If <b>{email}</b> has an account, we&apos;ve sent a link to reset the password. It works once and expires in 1 hour. Check spam if
              it doesn&apos;t arrive in a few minutes.
            </p>
          </div>
        </div>
        <Button variant="secondary" className="h-10 w-full" onClick={() => setSent(false)}>
          Use a different email
        </Button>
      </div>
    );

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api("/api/v1/auth/forgot-password", { body: { email } });
          setSent(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't send the link");
        } finally {
          setBusy(false);
        }
      }}
    >
      <ErrorBox message={error} />
      <Field label="Work email">
        <Input type="email" className="h-10" autoFocus autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Button type="submit" className="h-10 w-full" loading={busy}>
        Send reset link
      </Button>
    </form>
  );
}

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email you sign in with and we'll send you a link."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <Suspense>
        <ForgotForm />
      </Suspense>
    </AuthShell>
  );
}
