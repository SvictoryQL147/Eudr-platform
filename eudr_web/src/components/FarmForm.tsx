"use client";

import { toast } from "sonner";
import { useState } from "react";
import { api } from "@/lib/api";
import type { Farm, Farmer, Ring } from "@/lib/types";
import BoundaryEditor from "./BoundaryEditor";
import type { MapShape } from "./Map";
import { Button, ErrorBox, Field, Input, Modal, Select } from "./kit";

export default function FarmForm({
  open,
  onClose,
  onSaved,
  farmers,
  farm,
  defaultFarmerId,
  context = [],
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (f: Farm) => void;
  farmers: Farmer[];
  farm?: Farm | null;
  defaultFarmerId?: string | null;
  context?: MapShape[];
}) {
  const [farmerId, setFarmerId] = useState(farm?.farmer_id || defaultFarmerId || "");
  const [name, setName] = useState(farm?.name || "");
  const [ring, setRing] = useState<Ring>(farm?.polygon_ring ? farm.polygon_ring.slice(0, -1) : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ring.length > 0 && ring.length < 3) return setError("A boundary needs at least 3 points — or clear it to save the farm unmapped.");
    setBusy(true);
    setError(null);
    try {
      let saved: Farm;
      if (farm) {
        saved = await api<Farm>(`/api/v1/farms/${farm.id}`, {
          method: "PATCH",
          body: {
            farmer_id: farmerId || null,
            name: name || null,
            ...(ring.length >= 3 ? { polygon_ring: ring } : { clear_polygon: farm.has_geolocation && ring.length === 0 }),
          },
        });
      } else {
        saved = await api<Farm>("/api/v1/farms", {
          body: { farmer_id: farmerId || null, name: name || null, polygon_ring: ring.length >= 3 ? ring : null },
        });
      }
      toast.success(ring.length >= 3 ? "Farm saved with boundary" : "Farm saved — map its boundary next");
      onClose();
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the farm");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={farm ? "Edit farm" : "Add farm"} wide>
      <form className="space-y-4" onSubmit={submit}>
        <ErrorBox message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Farmer" hint="Farms without a farmer are flagged">
            <Select value={farmerId} onChange={(e) => setFarmerId(e.target.value)}>
              <option value="">— No farmer —</option>
              {farmers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.full_name}
                  {f.community ? ` (${f.community})` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Farm name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Idanre plot 2" />
          </Field>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Boundary</p>
          <BoundaryEditor value={ring} onChange={setRing} context={context} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {ring.length >= 3 ? "Save farm with boundary" : "Save farm (unmapped)"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
