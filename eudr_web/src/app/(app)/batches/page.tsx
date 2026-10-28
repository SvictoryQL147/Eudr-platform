"use client";

import { toast } from "sonner";
import { Boxes, ChevronDown, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Empty, ErrorBox, Field, Input, Loading, Modal, PageHeader, Table, Td } from "@/components/kit";
import { api } from "@/lib/api";
import { date, kg, shortId } from "@/lib/format";
import type { Batch, CollectionEvent } from "@/lib/types";
import { useApi } from "@/lib/useApi";

function CreateBatch({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const available = useApi<CollectionEvent[]>("/api/v1/collection-events?available_only=true");
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [output, setOutput] = useState("");
  const [outputTouched, setOutputTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputTotal = useMemo(() => Object.values(picked).reduce((s, v) => s + (Number(v) || 0), 0), [picked]);
  useEffect(() => {
    if (!outputTouched) setOutput(inputTotal ? String(+inputTotal.toFixed(1)) : "");
  }, [inputTotal, outputTouched]);
  const diff = inputTotal ? Math.abs(Number(output) - inputTotal) / inputTotal : 0;

  const toggle = (c: CollectionEvent) =>
    setPicked((p) => {
      const n = { ...p };
      if (n[c.id] !== undefined) delete n[c.id];
      else n[c.id] = String(c.available_kg);
      return n;
    });

  return (
    <Modal open={open} onClose={onClose} title="Create batch" wide>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const inputs = Object.entries(picked).map(([collection_event_id, q]) => ({ collection_event_id, quantity_kg: Number(q) }));
          if (!inputs.length) return setError("Pick at least one collection");
          setBusy(true);
          setError(null);
          try {
            await api("/api/v1/batches", { body: { output_kg: Number(output), inputs } });
            toast.success("Batch created");
            onClose();
            onSaved();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't create batch");
          } finally {
            setBusy(false);
          }
        }}
      >
        <ErrorBox message={error} />
        <p className="text-sm text-muted-foreground">Pick the weighed collections that went into this batch (lot). You can use part of a collection.</p>
        {available.loading && !available.data ? (
          <Loading />
        ) : available.data && available.data.length ? (
          <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
            <Table head={["", "Farm", "Farmer", "Collected", "Available", "Use (kg)"]}>
              {available.data.map((c) => {
                const on = picked[c.id] !== undefined;
                return (
                  <tr key={c.id} className={on ? "bg-accent" : ""}>
                    <Td>
                      <input type="checkbox" checked={on} onChange={() => toggle(c)} className="h-4 w-4 rounded border-border" aria-label="Use this collection" />
                    </Td>
                    <Td className="font-medium text-foreground">{c.farm_name || shortId(c.farm_id)}</Td>
                    <Td>{c.farmer_name || "—"}</Td>
                    <Td>{date(c.collected_at || c.created_at)}</Td>
                    <Td className="tabular-nums">{kg(c.available_kg)}</Td>
                    <Td>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max={c.available_kg}
                        disabled={!on}
                        value={picked[c.id] ?? ""}
                        onChange={(e) => setPicked({ ...picked, [c.id]: e.target.value })}
                        className="w-28"
                      />
                    </Td>
                  </tr>
                );
              })}
            </Table>
          </div>
        ) : (
          <Empty title="No collections available" body="Every collected kilo is already in a batch. Record new collections first." />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Inputs total">
            <Input disabled value={kg(inputTotal)} />
          </Field>
          <Field
            label="Batch output (kg)"
            required
            hint="What came out after drying/sorting/bagging"
            error={diff > 0.05 ? `Differs from inputs by ${(diff * 100).toFixed(1)}% — over 5% is flagged as critical` : undefined}
          >
            <Input
              type="number"
              step="0.1"
              min="0.1"
              required
              value={output}
              onChange={(e) => {
                setOutputTouched(true);
                setOutput(e.target.value);
              }}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Create batch
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function BatchesInner() {
  const batches = useApi<Batch[]>("/api/v1/batches");
  const params = useSearchParams();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    if (params.get("new")) setCreating(true);
    if (typeof window !== "undefined" && window.location.hash) setOpen(window.location.hash.slice(1));
  }, [params]);

  return (
    <>
      <PageHeader
        title="Batches"
        subtitle="Lots made from weighed collections. Each batch traces back to its farms."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
            Create batch
          </Button>
        }
      />
      <Card>
        {batches.loading && !batches.data ? (
          <Loading />
        ) : batches.data && batches.data.length ? (
          <Table head={["", "Batch", "Created", "Inputs", "Output", "Farms", "Shipment"]}>
            {batches.data.map((b) => {
              const mismatch = b.input_total_kg ? Math.abs(b.output_kg - b.input_total_kg) / b.input_total_kg > 0.05 : true;
              const expanded = open === b.id;
              return (
                <Fragment key={b.id}>
                  <tr id={b.id} className="cursor-pointer hover:bg-secondary" onClick={() => setOpen(expanded ? null : b.id)}>
                    <Td className="w-8">{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</Td>
                    <Td className="font-mono text-xs font-medium text-foreground">{shortId(b.id)}</Td>
                    <Td>{date(b.created_at)}</Td>
                    <Td className="tabular-nums">{kg(b.input_total_kg)}</Td>
                    <Td className="tabular-nums">
                      {kg(b.output_kg)} {mismatch && <Badge tone="red">Mismatch</Badge>}
                    </Td>
                    <Td>{b.farm_count}</Td>
                    <Td>
                      {b.shipment_ids.length ? (
                        <Link href={`/shipments/${b.shipment_ids[0]}`} onClick={(e) => e.stopPropagation()} className="text-primary hover:underline">
                          View
                        </Link>
                      ) : (
                        <Badge>Not shipped</Badge>
                      )}
                    </Td>
                  </tr>
                  {expanded && (
                    <tr className="bg-secondary/50">
                      <td colSpan={7} className="px-12 py-3">
                        {b.inputs.length ? (
                          <ul className="space-y-1 text-sm">
                            {b.inputs.map((i) => (
                              <li key={i.collection_event_id} className="flex justify-between gap-4">
                                <span>
                                  {i.farm_id ? (
                                    <Link href={`/farms/${i.farm_id}`} className="font-medium text-foreground hover:text-primary">
                                      {i.farm_name || shortId(i.farm_id)}
                                    </Link>
                                  ) : (
                                    "Unknown farm"
                                  )}{" "}
                                  <span className="text-muted-foreground">· {i.farmer_name || "no farmer"}</span>
                                </span>
                                <span className="tabular-nums">{kg(i.quantity_kg)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-red-700">This batch has no inputs — it can't be traced to any farm.</p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </Table>
        ) : (
          <Empty icon={<Boxes className="h-5 w-5" />} title="No batches yet" body="Group collections into a batch, then put batches into a shipment." action={<Button onClick={() => setCreating(true)}>Create batch</Button>} />
        )}
      </Card>
      {creating && (
        <CreateBatch
          open
          onClose={() => {
            setCreating(false);
            if (params.get("new")) router.replace("/batches");
          }}
          onSaved={batches.reload}
        />
      )}
    </>
  );
}

export default function BatchesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <BatchesInner />
    </Suspense>
  );
}
