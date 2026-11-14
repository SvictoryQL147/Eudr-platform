"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AuthShell from "@/components/AuthShell";
import { MIN_PASSWORD, PasswordInput, PasswordStrength } from "@/components/auth/PasswordInput";
import { Button, ErrorBox } from "@/components/kit";
import { api } from "@/lib/api";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : "This link is missing its token. Open the link from your email again.");

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (password !== confirm) return setError("The two passwords don't match");
        setBusy(true);
        setError(null);
        try {
          await api("/api/v1/auth/reset-password", { body: { token, password } });
          router.replace("/login?reset=1");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't reset the password");
          setBusy(false);
        }
      }}
    >
      <ErrorBox message={error} />
      <div>
        <label htmlFor="pw" className="mb-1.5 block text-sm font-medium">
          New password
        </label>
        <PasswordInput id="pw" autoFocus required minLength={MIN_PASSWORD} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <PasswordStrength password={password} />
      </div>
      <div>
        <label htmlFor="pw2" className="mb-1.5 block text-sm font-medium">
          Repeat it
        </label>
        <PasswordInput id="pw2" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <Button type="submit" className="h-10 w-full" loading={busy} disabled={!token}>
        Save new password
      </Button>
      <p className="text-center text-xs text-muted-foreground">You&apos;ll be signed out on every other device.</p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Pick something you don't use on other sites."
      footer={
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">
          Need a new link?
        </Link>
      }
    >
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
