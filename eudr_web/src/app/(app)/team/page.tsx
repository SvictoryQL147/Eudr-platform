"use client";

import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, Empty, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, Table, Td } from "@/components/kit";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS, date } from "@/lib/format";
import type { Role, User } from "@/lib/types";
import { useApi } from "@/lib/useApi";

function AddMember({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", role: "field_agent" as Role, password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsPassword = form.role !== "field_agent";
  return (
    <Modal open onClose={onClose} title="Add team member">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await api("/api/v1/users", { body: { ...form, password: form.password || null } });
            toast.success("Team member added");
            onClose();
            onSaved();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't add");
          } finally {
            setBusy(false);
          }
        }}
      >
        <ErrorBox message={error} />
        <Field label="Name" required>
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Email" required>
          <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Role">
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={needsPassword ? "Temporary password" : "Password (optional)"}
          hint={needsPassword ? "Share it with them; at least 8 characters" : "Field agents only need a record for collections. Give a password if they should sign in."}
          required={needsPassword}
        >
          <Input type="text" minLength={8} required={needsPassword} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Add member
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function TeamPage() {
  const users = useApi<User[]>("/api/v1/users");
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const isAdmin = user?.role === "admin";
  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Staff who use the dashboard and field agents who record collections"
        actions={
          isAdmin && (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>
              Add member
            </Button>
          )
        }
      />
      <Card>
        {users.loading && !users.data ? (
          <Loading />
        ) : users.data && users.data.length ? (
          <Table head={["Name", "Email", "Role", "Added", "Status", ""]}>
            {users.data.map((u) => (
              <tr key={u.id}>
                <Td className="font-medium text-foreground">
                  {u.name} {u.id === user?.id && <span className="text-xs text-muted-foreground">(you)</span>}
                </Td>
                <Td>{u.email}</Td>
                <Td>{ROLE_LABELS[u.role]}</Td>
                <Td>{date(u.created_at)}</Td>
                <Td>{u.is_active ? <Badge tone="green">Active</Badge> : <Badge>Deactivated</Badge>}</Td>
                <Td>
                  {isAdmin && u.is_active && u.id !== user?.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await api(`/api/v1/users/${u.id}/deactivate`, { method: "PATCH" });
                        users.reload();
                      }}
                    >
                      Deactivate
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty icon={<Users className="h-5 w-5" />} title="No team members" />
        )}
      </Card>
      {adding && <AddMember onClose={() => setAdding(false)} onSaved={users.reload} />}
    </>
  );
}
