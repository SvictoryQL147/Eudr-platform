"use client";

import { KeyRound, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ActivityFeed } from "@/components/Activity";
import { MIN_PASSWORD, PasswordInput, PasswordStrength } from "@/components/auth/PasswordInput";
import { Badge, Button, Card, CardHeader, ErrorBox, PageHeader } from "@/components/kit";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS, date } from "@/lib/format";
import type { Session } from "@/lib/types";

const PERMISSION_TEXT: Record<string, string> = {
  "records.write": "Add and edit farmers, farms, harvests and collections",
  "supply_chain.write": "Create batches and shipments",
  "documents.write": "Upload documents",
  "compliance.run": "Run readiness checks and deforestation screening",
  "users.manage": "Invite and manage the team",
  "audit.view": "See the whole organization's activity",
};

function ChangePassword() {
  const { accept } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const s = await api<Session>("/api/v1/auth/change-password", { body: { current_password: current, new_password: next } });
          accept(s);
          setCurrent("");
          setNext("");
          toast.success("Password changed. Other devices have been signed out.");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't change the password");
        } finally {
          setBusy(false);
        }
      }}
    >
      <ErrorBox message={error} />
      <div>
        <label htmlFor="cur" className="mb-1.5 block text-sm font-medium">
          Current password
        </label>
        <PasswordInput id="cur" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div>
        <label htmlFor="new" className="mb-1.5 block text-sm font-medium">
          New password
        </label>
        <PasswordInput id="new" required minLength={MIN_PASSWORD} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        <PasswordStrength password={next} />
      </div>
      <Button type="submit" loading={busy}>
        Change password
      </Button>
    </form>
  );
}

export default function AccountPage() {
  const { user, organization, permissions } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  return (
    <>
      <PageHeader title="Your account" subtitle="Profile, password and sign-in security" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Profile" icon={<UserRound className="h-4 w-4" />} />
            <div className="flex items-center gap-4 p-5">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-800 font-display text-lg font-bold text-white">
                {user.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase())
                  .join("")}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold">{user.name}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge tone="green">{ROLE_LABELS[user.role]}</Badge>
                  <Badge>{organization?.name}</Badge>
                </div>
              </div>
            </div>
            <div className="border-t px-5 py-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">What your role can do</p>
              <ul className="space-y-1.5 text-sm">
                {Object.entries(PERMISSION_TEXT).map(([p, text]) => (
                  <li key={p} className={permissions.includes(p as never) ? "text-foreground" : "text-muted-foreground line-through decoration-muted-foreground/40"}>
                    {text}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">Everyone in the organization can view all records. Member since {date(user.created_at)}.</p>
            </div>
          </Card>
          <Card>
            <CardHeader title="Sign-in security" icon={<ShieldCheck className="h-4 w-4" />} />
            <div className="space-y-3 p-5 text-sm">
              <p className="text-muted-foreground">
                Lost a phone or used a shared computer? Sign out of every device, including this one. You&apos;ll need your password to sign back in.
              </p>
              <Button
                variant="secondary"
                icon={<LogOut className="h-4 w-4" />}
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api("/api/v1/auth/logout-everywhere", { method: "POST" });
                  } finally {
                    window.location.href = "/login";
                  }
                }}
              >
                Sign out everywhere
              </Button>
            </div>
          </Card>
        </div>
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Change password" icon={<KeyRound className="h-4 w-4" />} subtitle="Signs you out on other devices" />
            <div className="p-5">
              <ChangePassword />
            </div>
          </Card>
          <Card>
            <CardHeader title="Your recent activity" />
            <div className="p-5">
              <ActivityFeed query={`&user_id=${user.id}`} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
