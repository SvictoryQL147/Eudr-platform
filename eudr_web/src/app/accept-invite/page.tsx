"use client";

import { Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AuthShell from "@/components/AuthShell";
import { MIN_PASSWORD, PasswordInput, PasswordStrength } from "@/components/auth/PasswordInput";
import { Button, ErrorBox, Loading } from "@/components/kit";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Session } from "@/lib/types";

type Info = { email: string; name: string; organization_name: string; role: string };

function AcceptForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { accept } = useAuth();
  const token = params.get("token") || "";
  const [info, setInfo] = useState<Info | null>(null);
  const [loadError, setLoadError] = useState<string | null>(token ? null : "This invitation link is incomplete. Open it from your email again.");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api<Info>(`/api/v1/auth/invite/${encodeURIComponent(token)}`)
      .then(setInfo)
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Invitation not found"));
  }, [token]);

  if (loadError) return <ErrorBox message={loadError} />;
  if (!info) return <Loading rows={3} />;

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          accept(await api<Session>("/api/v1/auth/accept-invite", { body: { token, password } }));
          router.replace("/dashboard");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't accept the invitation");
          setBusy(false);
        }
      }}
    >
      <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <Building2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-sm">
          <p className="truncate font-semibold">{info.organization_name}</p>
          <p className="truncate text-muted-foreground">
            {info.email} · {info.role}
          </p>
        </div>
      </div>
      <ErrorBox message={error} />
      <div>
        <label htmlFor="pw" className="mb-1.5 block text-sm font-medium">
          Set your password
        </label>
        <PasswordInput id="pw" autoFocus required minLength={MIN_PASSWORD} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <PasswordStrength password={password} />
      </div>
      <Button type="submit" className="h-10 w-full" loading={busy}>
        Join {info.organization_name}
      </Button>
    </form>
  );
}

export default function AcceptInvitePage() {
  return (
    <AuthShell
      title="You're invited"
      subtitle="Set a password to activate your account."
      footer={
        <>
          Already set up?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Suspense>
        <AcceptForm />
      </Suspense>
    </AuthShell>
  );
}
