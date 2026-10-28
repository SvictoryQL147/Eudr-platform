"use client";

import { toast } from "sonner";
import { useState } from "react";
import { api } from "@/lib/api";
import { NIGERIAN_STATES } from "@/lib/format";
import type { Farmer } from "@/lib/types";
import { Button, ErrorBox, Field, Input, Modal, Select } from "./kit";

export default function FarmerForm({
  open,
  onClose,
  onSaved,
  farmer,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (f: Farmer) => void;
  farmer?: Farmer | null;
}) {
  const [form, setForm] = useState({
    full_name: farmer?.full_name || "",
    phone_number: farmer?.phone_number || "",
    national_id_number: farmer?.national_id_number || "",
    community: farmer?.community || "",
    state: farmer?.state || "Ondo",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <Modal open={open} onClose={onClose} title={farmer ? "Edit farmer" : "Register farmer"}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || null]));
          try {
            const saved = farmer
              ? await api<Farmer>(`/api/v1/farmers/${farmer.id}`, { method: "PATCH", body })
              : await api<Farmer>("/api/v1/farmers", { body });
            toast.success(farmer ? "Farmer updated" : "Farmer registered");
            onClose();
            onSaved(saved);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't save");
          } finally {
            setBusy(false);
          }
        }}
      >
        <ErrorBox message={error} />
        <Field label="Full name" required>
          <Input required minLength={2} value={form.full_name} onChange={set("full_name")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone number">
            <Input value={form.phone_number} onChange={set("phone_number")} placeholder="+234…" inputMode="tel" />
          </Field>
          <Field label="NIN or other ID number" hint="Missing ID is flagged as a high-severity problem">
            <Input value={form.national_id_number} onChange={set("national_id_number")} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Community / village">
            <Input value={form.community} onChange={set("community")} placeholder="e.g. Idanre" />
          </Field>
          <Field label="State">
            <Select value={form.state} onChange={set("state")}>
              {NIGERIAN_STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {farmer ? "Save changes" : "Register farmer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
