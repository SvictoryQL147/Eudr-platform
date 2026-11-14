"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthShell from "@/components/AuthShell";
import { MIN_PASSWORD, PasswordInput, PasswordStrength } from "@/components/auth/PasswordInput";
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
    <AuthShell
      title="Create your workspace"
      subtitle="For exporters, aggregators and cooperatives. You'll be the admin and can invite your team."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
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
            setBusy(false);
          }
        }}
      >
        <ErrorBox message={error} />
        <Field label="Company name" required>
          <Input className="h-10" required autoFocus value={form.organization_name} onChange={set("organization_name")} placeholder="e.g. Ondo Cocoa Exports Ltd" />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Your name" required>
            <Input className="h-10" required autoComplete="name" value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Work email" required>
            <Input className="h-10" type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
          </Field>
        </div>
        <div>
          <label htmlFor="pw" className="mb-1.5 block text-sm font-medium">
            Password <span className="text-red-600">*</span>
          </label>
          <PasswordInput id="pw" required minLength={MIN_PASSWORD} autoComplete="new-password" value={form.password} onChange={set("password")} />
          <PasswordStrength password={form.password} />
        </div>
        <Button type="submit" className="h-10 w-full" loading={busy}>
          Create workspace <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-center text-xs text-muted-foreground">Free to start. No card needed.</p>
      </form>
    </AuthShell>
  );
}
