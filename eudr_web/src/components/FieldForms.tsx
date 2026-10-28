"use client";

import { toast } from "sonner";
import { useState } from "react";
import { api } from "@/lib/api";
import type { Farm, User } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { Button, ErrorBox, Field, Input, Modal, Select } from "./kit";

function FarmSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const farms = useApi<Farm[]>("/api/v1/farms");
  return (
    <Select required value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose a farm…</option>
      {(farms.data || []).map((f) => (
        <option key={f.id} value={f.id}>
          {f.name || f.id.slice(0, 8)} — {f.farmer_name || "no farmer"}
          {f.has_geolocation ? "" : " (not mapped)"}
        </option>
      ))}
    </Select>
  );
}

export function HarvestForm({ open, onClose, onSaved, farmId }: { open: boolean; onClose: () => void; onSaved: () => void; farmId?: string }) {
  const [farm, setFarm] = useState(farmId || "");
  const [qty, setQty] = useState("");
  const [when, setWhen] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal open={open} onClose={onClose} title="Record harvest">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await api("/api/v1/harvests", { body: { farm_id: farm, quantity_kg: Number(qty), harvest_date: when || null } });
            toast.success("Harvest recorded");
            onClose();
            onSaved();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't save");
          } finally {
            setBusy(false);
          }
        }}
      >
        <ErrorBox message={error} />
        {!farmId && (
          <Field label="Farm" required>
            <FarmSelect value={farm} onChange={setFarm} />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quantity (kg)" required hint="As reported by the farmer">
            <Input type="number" min="0.1" step="0.1" required value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Harvest date">
            <Input type="date" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Save harvest
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function CollectionForm({ open, onClose, onSaved, farmId }: { open: boolean; onClose: () => void; onSaved: () => void; farmId?: string }) {
  const users = useApi<User[]>("/api/v1/users");
  const [farm, setFarm] = useState(farmId || "");
  const [weight, setWeight] = useState("");
  const [agent, setAgent] = useState("");
  const [grade, setGrade] = useState("");
  const [when, setWhen] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  const [gpsOk, setGpsOk] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const agents = (users.data || []).filter((u) => u.is_active);
  return (
    <Modal open={open} onClose={onClose} title="Record collection">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await api("/api/v1/collection-events", {
              body: {
                farm_id: farm,
                weight_kg: Number(weight),
                agent_user_id: agent || null,
                quality_grade: grade || null,
                location_recorded: gpsOk,
                collected_at: when ? new Date(when).toISOString() : null,
              },
            });
            toast.success("Collection recorded");
            onClose();
            onSaved();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't save");
          } finally {
            setBusy(false);
          }
        }}
      >
        <ErrorBox message={error} />
        {!farmId && (
          <Field label="Farm" required>
            <FarmSelect value={farm} onChange={setFarm} />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Weighed (kg)" required>
            <Input type="number" min="0.1" step="0.1" required value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Collected at">
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Field agent" hint="Add agents under Team">
            <Select value={agent} onChange={(e) => setAgent(e.target.value)}>
              <option value="">— Not recorded —</option>
              {agents.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quality grade">
            <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. Grade 1" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={gpsOk} onChange={(e) => setGpsOk(e.target.checked)} className="h-4 w-4 rounded border-border text-primary" />
          GPS location was recorded at the point of collection
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Save collection
          </Button>
        </div>
      </form>
    </Modal>
  );
}
