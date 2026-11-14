"use client";

import { Check, Copy, Mail, MoreHorizontal, Plus, Send, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { timeAgo } from "@/components/Activity";
import { Badge, Button, Card, Empty, ErrorBox, Field, Input, Loading, Modal, PageHeader, Table, Td } from "@/components/kit";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/format";
import type { InviteResult, Role, User } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const ROLE_HELP: Record<Role, string> = {
  admin: "Everything, including inviting people and changing roles",
  exporter_staff: "Runs the supply chain: farmers, farms, batches, shipments",
  compliance_reviewer: "Runs readiness checks and screening, sees all activity",
  field_agent: "Registers farmers, maps farms, records collections",
};

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <Input readOnly value={url} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
      <Button
        type="button"
        variant="secondary"
        icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

function InviteResultView({ result, onClose }: { result: InviteResult; onClose: () => void }) {
  return (
    <div className="space-y-4">
      {result.email_sent ? (
        <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <Mail className="h-5 w-5 flex-none text-emerald-600" />
          <p>
            Invitation sent to <b>{result.user.email}</b>. The link expires in 7 days.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Email isn&apos;t set up on this server yet, so nothing was sent. Send <b>{result.user.name}</b> this link yourself (WhatsApp works). It
            expires in 7 days and works once.
          </div>
          {result.invite_url && <CopyLink url={result.invite_url} />}
        </>
      )}
      <div className="flex justify-end">
        <Button onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

function InviteMember({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", role: "exporter_staff" as Role });
  const [recordOnly, setRecordOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResult | null>(null);

  return (
    <Modal open onClose={onClose} title={result ? "Invitation ready" : "Invite a team member"} description={result ? undefined : "They'll get an email with a link to set their own password."}>
      {result ? (
        <InviteResultView result={result} onClose={onClose} />
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              if (recordOnly) {
                await api("/api/v1/users", { body: { ...form, role: "field_agent", password: null } });
                toast.success(`${form.name} added as a field agent record`);
                onClose();
              } else {
                setResult(await api<InviteResult>("/api/v1/users/invite", { body: form }));
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : "Couldn't invite");
            } finally {
              setBusy(false);
            }
          }}
        >
          <ErrorBox message={error} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" required>
              <Input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Email" required>
              <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
          </div>
          {!recordOnly && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Role</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(Object.keys(ROLE_HELP) as Role[]).map((r) => (
                  <label
                    key={r}
                    className={`cursor-pointer rounded-xl border p-3 text-sm transition ${form.role === r ? "border-primary bg-accent ring-1 ring-primary" : "hover:bg-secondary"}`}
                  >
                    <input type="radio" name="role" className="sr-only" checked={form.role === r} onChange={() => setForm({ ...form, role: r })} />
                    <span className="block font-medium">{ROLE_LABELS[r]}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{ROLE_HELP[r]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input type="checkbox" className="mt-0.5" checked={recordOnly} onChange={(e) => setRecordOnly(e.target.checked)} />
            <span>Record only: a field agent who won&apos;t sign in (so collections can be credited to them).</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={busy} icon={recordOnly ? <Plus className="h-4 w-4" /> : <Send className="h-4 w-4" />}>
              {recordOnly ? "Add record" : "Send invitation"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function MemberMenu({ u, onResult }: { u: User; onResult: (r: InviteResult) => void }) {
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label={`Manage ${u.name}`}>
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Change role</DropdownMenuLabel>
        {(Object.keys(ROLE_LABELS) as Role[])
          .filter((r) => r !== u.role)
          .map((r) => (
            <DropdownMenuItem key={r} onSelect={() => run(() => api(`/api/v1/users/${u.id}`, { method: "PATCH", body: { role: r } }), `${u.name} is now ${ROLE_LABELS[r]}`)}>
              {ROLE_LABELS[r]}
            </DropdownMenuItem>
          ))}
        <DropdownMenuSeparator />
        {!u.has_login && u.is_active && (
          <DropdownMenuItem
            onSelect={async () => {
              try {
                const r = await api<InviteResult>(`/api/v1/users/${u.id}/resend-invite`, { method: "POST" });
                if (r.email_sent) toast.success(`Invitation re-sent to ${u.email}`);
                else onResult(r);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Couldn't resend");
              }
            }}
          >
            <Send /> {u.invite_pending ? "Resend invitation" : "Invite to sign in"}
          </DropdownMenuItem>
        )}
        {u.is_active ? (
          <DropdownMenuItem
            className="text-red-600 focus:text-red-700"
            onSelect={() => run(() => api(`/api/v1/users/${u.id}`, { method: "PATCH", body: { is_active: false } }), `${u.name} deactivated and signed out`)}
          >
            Deactivate
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => run(() => api(`/api/v1/users/${u.id}`, { method: "PATCH", body: { is_active: true } }), `${u.name} reactivated`)}>
            Reactivate
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function TeamPage() {
  const users = useApi<User[]>("/api/v1/users");
  const { user, can } = useAuth();
  const [inviting, setInviting] = useState(false);
  const [resent, setResent] = useState<InviteResult | null>(null);
  const isAdmin = can("users.manage");
  const rows = users.data || [];
  const active = rows.filter((u) => u.is_active && u.has_login).length;
  const pending = rows.filter((u) => u.is_active && u.invite_pending).length;
  const records = rows.filter((u) => u.is_active && !u.has_login && !u.invite_pending).length;

  return (
    <>
      <PageHeader
        title="Team"
        subtitle={`${active} with sign-in${pending ? ` · ${pending} invited` : ""}${records ? ` · ${records} record-only` : ""}. Each person signs in with their own account, so every change is traceable to who made it.`}
        actions={
          isAdmin && (
            <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setInviting(true)}>
              Invite member
            </Button>
          )
        }
      />
      <Card>
        {users.loading && !users.data ? (
          <Loading />
        ) : users.error ? (
          <div className="p-5">
            <ErrorBox message={users.error} />
          </div>
        ) : rows.length ? (
          <Table head={["Person", "Role", "Last active", "Status", ""]}>
            {rows.map((u) => (
              <tr key={u.id} className={u.is_active ? "" : "opacity-60"}>
                <Td>
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
                      {u.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase())
                        .join("")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {u.name} {u.id === user?.id && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </Td>
                <Td>{ROLE_LABELS[u.role]}</Td>
                <Td>{u.last_login_at ? timeAgo(u.last_login_at) : "Never"}</Td>
                <Td>
                  {!u.is_active ? (
                    <Badge>Deactivated</Badge>
                  ) : u.invite_pending ? (
                    <Badge tone="amber">Invited</Badge>
                  ) : !u.has_login ? (
                    <Badge tone="blue">Record only</Badge>
                  ) : (
                    <Badge tone="green">Active</Badge>
                  )}
                </Td>
                <Td className="text-right">{isAdmin && u.id !== user?.id && <MemberMenu u={u} onResult={setResent} />}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty icon={<Users className="h-5 w-5" />} title="No team members" />
        )}
      </Card>
      {inviting && <InviteMember onClose={() => setInviting(false)} />}
      {resent && (
        <Modal open onClose={() => setResent(null)} title="Invitation ready">
          <InviteResultView result={resent} onClose={() => setResent(null)} />
        </Modal>
      )}
    </>
  );
}
