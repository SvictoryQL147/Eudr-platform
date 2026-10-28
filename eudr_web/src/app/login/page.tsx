"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AuthShell from "@/components/AuthShell";
import { Button, ErrorBox, Field, Input } from "@/components/kit";
import { useAuth } from "@/lib/auth";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(params.get("expired") ? "Your session expired. Sign in again." : null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await login(email, password);
          router.replace("/dashboard");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Sign-in failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <ErrorBox message={error} />
      <Field label="Email">
        <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Password">
        <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Button type="submit" className="w-full" loading={busy}>
        Sign in
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New exporter?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell title="Sign in" subtitle="Welcome back. Sign in to your organization.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
