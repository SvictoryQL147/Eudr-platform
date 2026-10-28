"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthShell from "@/components/AuthShell";
import { Button, ErrorBox, Field, Input } from "@/components/kit";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ organization_name: "", name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <AuthShell title="Create your account" subtitle="Set up your exporter, aggregator or cooperative.">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await register(form);
            router.replace("/dashboard");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't create the account");
          } finally {
            setBusy(false);
          }
        }}
      >
        <ErrorBox message={error} />
        <Field label="Company name" required>
          <Input required value={form.organization_name} onChange={set("organization_name")} placeholder="e.g. Ondo Cocoa Exports Ltd" />
        </Field>
        <Field label="Your name" required>
          <Input required autoComplete="name" value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Work email" required>
          <Input type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Password" hint="At least 8 characters" required>
          <Input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set("password")} />
        </Field>
        <Button type="submit" className="w-full" loading={busy}>
          Create account
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
