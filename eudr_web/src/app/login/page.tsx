"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AuthShell from "@/components/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button, ErrorBox, Field, Input } from "@/components/kit";
import { useAuth } from "@/lib/auth";

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

function LoginForm() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(params.get("expired") ? "Your session ended. Sign in again to continue." : null);
  const [busy, setBusy] = useState(false);
  const reset = params.get("reset") === "1";

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, router, next]);

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await login(email, password);
          router.replace(next);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Sign-in failed");
          setBusy(false);
        }
      }}
    >
      {reset && !error && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">Password updated. Sign in with your new password.</div>
      )}
      <ErrorBox message={error} />
      <Field label="Work email">
        <Input type="email" className="h-10" autoComplete="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
      </Field>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Link href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="text-sm font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordInput id="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" className="h-10 w-full" loading={busy}>
        Sign in <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your organization's workspace."
      footer={
        <>
          New to Ala Trace?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create a company account
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
