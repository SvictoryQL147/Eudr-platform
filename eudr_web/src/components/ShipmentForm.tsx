"use client";

import { toast } from "sonner";
import { useState } from "react";
import { api } from "@/lib/api";
import { COMMODITIES, EU_COUNTRIES, kg, shortId } from "@/lib/format";
import type { Batch, Shipment } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { Button, ErrorBox, Field, Input, Modal, Select } from "./kit";

export default function ShipmentForm({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (s: Shipment) => void }) {
  const batches = useApi<Batch[]>("/api/v1/batches");
  const free = (batches.data || []).filter((b) => b.shipment_ids.length === 0);
  const [form, setForm] = useState({ reference: "", buyer_name: "", destination_country: "Netherlands", commodity: "cocoa", hs_code: "1801" });
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = free.filter((b) => picked.includes(b.id)).reduce((s, b) => s + b.output_kg, 0);

  return (
    <Modal open={open} onClose={onClose} title="New shipment" wide>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const s = await api<Shipment>("/api/v1/shipments", {
              body: { ...form, reference: form.reference || null, buyer_name: form.buyer_name || null, batch_ids: picked },
            });
            toast.success("Shipment created — check its readiness next");
            onClose();
            onSaved(s);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't create shipment");
          } finally {
            setBusy(false);
          }
        }}
      >
        <ErrorBox message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your reference" hint="Booking, contract or container number">
            <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="e.g. LOS-RTM-0415" />
          </Field>
          <Field label="EU buyer">
            <Input value={form.buyer_name} onChange={(e) => setForm({ ...form, buyer_name: e.target.value })} placeholder="Company name" />
          </Field>
          <Field label="Destination country">
            <Select value={form.destination_country} onChange={(e) => setForm({ ...form, destination_country: e.target.value })}>
              {EU_COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
              <option>Other (non-EU)</option>
            </Select>
          </Field>
          <Field label="Commodity" hint={`HS code ${form.hs_code}`}>
            <Select
              value={form.commodity}
              onChange={(e) => {
                const c = COMMODITIES.find((x) => x.value === e.target.value)!;
                setForm({ ...form, commodity: c.value, hs_code: c.hs });
              }}
            >
              {COMMODITIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Batches in this shipment</p>
          {free.length ? (
            <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {free.map((b) => (
                <label key={b.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary">
                  <input
                    type="checkbox"
                    checked={picked.includes(b.id)}
                    onChange={() => setPicked((p) => (p.includes(b.id) ? p.filter((x) => x !== b.id) : [...p, b.id]))}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="font-mono text-xs">{shortId(b.id)}</span>
                  <span className="text-muted-foreground">
                    {b.farm_count} farm{b.farm_count === 1 ? "" : "s"}
                  </span>
                  <span className="ml-auto tabular-nums">{kg(b.output_kg)}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">No unshipped batches. You can still create the shipment and add batches later.</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            Net mass: <b className="tabular-nums">{kg(total)}</b>
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Create shipment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
