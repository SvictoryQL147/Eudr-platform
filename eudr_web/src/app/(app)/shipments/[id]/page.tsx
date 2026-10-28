"use client";

import { ArrowRight, CheckCircle2, FileJson, ListChecks, Map as MapIcon, Printer, RefreshCw, Trees, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useState } from "react";
import { DocumentList, UploadDocumentButton } from "@/components/Documents";
import FarmMap from "@/components/Map";
import MapLegend from "@/components/MapLegend";
import { RiskBadge, ScreenButton } from "@/components/Screening";
import { Badge, Button, Card, CardHeader, ErrorBox, LinkButton, Modal, PageHeader, PageLoading, ScoreRing, SeverityBadge, StatusBadge, Table, Td, Tr } from "@/components/kit";
import { api, downloadFile, downloadJson } from "@/lib/api";
import { SEVERITY_ORDER, dateTime, entityLink, ha, kg, riskTone, shortId } from "@/lib/format";
import type { AssessmentSummary, Batch, DocumentItem, EvidencePack, Readiness, Shipment } from "@/lib/types";
import { useApi } from "@/lib/useApi";

function AddBatches({ shipment, onClose, onSaved }: { shipment: Shipment; onClose: () => void; onSaved: () => void }) {
  const batches = useApi<Batch[]>("/api/v1/batches");
  const free = (batches.data || []).filter((b) => b.shipment_ids.length === 0);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal open onClose={onClose} title="Add batches">
      <ErrorBox message={error} />
      {free.length ? (
        <div className="divide-y divide-border rounded-lg border border-border">
          {free.map((b) => (
            <label key={b.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary">
              <input type="checkbox" checked={picked.includes(b.id)} onChange={() => setPicked((p) => (p.includes(b.id) ? p.filter((x) => x !== b.id) : [...p, b.id]))} />
              <span className="font-mono text-xs">{shortId(b.id)}</span>
              <span className="text-muted-foreground">{b.farm_count} farms</span>
              <span className="ml-auto tabular-nums">{kg(b.output_kg)}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No unshipped batches available.</p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          loading={busy}
          disabled={!picked.length}
          onClick={async () => {
            setBusy(true);
            try {
              await api(`/api/v1/shipments/${shipment.id}`, { method: "PATCH", body: { add_batch_ids: picked } });
              toast.success("Batches added");
              onClose();
              onSaved();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          Add {picked.length || ""} batch{picked.length === 1 ? "" : "es"}
        </Button>
      </div>
    </Modal>
  );
}

export default function ShipmentDetail({ params }: { params: { id: string } }) {
  const id = params.id;
  const shipment = useApi<Shipment>(`/api/v1/shipments/${id}`);
  // Only ask for readiness once an assessment exists (avoids a 404 on new shipments).
  const readiness = useApi<Readiness>(shipment.data?.last_assessed_at ? `/api/v1/shipments/${id}/readiness?at=${shipment.data.last_assessed_at}` : null);
  const history = useApi<AssessmentSummary[]>(`/api/v1/shipments/${id}/assessments`);
  const pack = useApi<EvidencePack>(`/api/v1/shipments/${id}/evidence-pack`);
  const docs = useApi<DocumentItem[]>(`/api/v1/documents?linked_to_id=${id}`);
  const [assessing, setAssessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const refreshAll = () => {
    shipment.reload();
    readiness.reload();
    history.reload();
    pack.reload();
    docs.reload();
  };

  const assess = async () => {
    setAssessing(true);
    setError(null);
    try {
      const res = await api<Readiness>(`/api/v1/shipments/${id}/assess`, { method: "POST" });
      refreshAll();
      if (res.is_blocked) toast.error(`Blocked — score ${res.score}`, { description: `${res.findings.length} problem(s) to fix` });
      else toast.success(`Score ${res.score}`, { description: res.findings.length ? `${res.findings.length} problem(s) left` : "All checks passed" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assessment failed");
    } finally {
      setAssessing(false);
    }
  };

  if (shipment.loading) return <PageLoading />;
  if (shipment.error) return <ErrorBox message={shipment.error} />;
  const s = shipment.data!;
  const r = readiness.data;
  const p = pack.data;
  const name = s.reference || shortId(s.id);
  const grouped = SEVERITY_ORDER.map((sev) => ({ sev, items: (r?.findings || []).filter((f) => f.severity === sev) })).filter((g) => g.items.length);
  // Rule messages reference records by id; show names people recognise instead.
  const names = new Map<string, string>();
  p?.producers.forEach((x) => {
    names.set(x.farmer_id, x.name);
    names.set(x.farm_id, `"${p.chain_of_custody.flatMap((b) => b.inputs).find((i) => i.farm_id === x.farm_id)?.farm_name || shortId(x.farm_id)}"`);
  });
  p?.chain_of_custody.forEach((b) => {
    names.set(b.batch_id, shortId(b.batch_id));
    b.inputs.forEach((i) => i.farm_id && !names.has(i.farm_id) && names.set(i.farm_id, `"${i.farm_name || shortId(i.farm_id)}"`));
  });
  names.set(s.id, name);
  const humanize = (text: string) =>
    text.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, (m) => names.get(m) || shortId(m));

  return (
    <>
      <PageHeader
        back={{ href: "/shipments", label: "Shipments" }}
        title={name}
        subtitle={[s.buyer_name, s.destination_country, `HS ${s.hs_code}`].filter(Boolean).join(" · ")}
        actions={
          <>
            <Button variant="secondary" icon={<Printer className="h-4 w-4" />} onClick={() => window.open(`/shipments/${id}/evidence`, "_blank")}>
              Evidence pack
            </Button>
            <Button icon={<RefreshCw className="h-4 w-4" />} loading={assessing} onClick={assess}>
              {r ? "Re-check readiness" : "Check readiness"}
            </Button>
          </>
        }
      />
      <ErrorBox message={error} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center px-6 py-6 text-center">
          <ScoreRing score={r?.score ?? null} blocked={r?.is_blocked} size={140} />
          <div className="mt-4">
            <StatusBadge score={r?.score ?? null} blocked={r?.is_blocked ?? null} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {!r
              ? "Not checked yet. Check readiness to see what's missing."
              : r.is_blocked
                ? "Blocked: fix every critical problem before this can ship."
                : r.score >= 90
                  ? "Ready. Send the evidence pack to your buyer."
                  : "Not blocked, but fix the remaining problems to raise the score."}
          </p>
          {r && <p className="mt-2 text-xs text-muted-foreground">Checked {dateTime(r.computed_at)}</p>}
          {r && <p className="mt-1 text-xs text-muted-foreground">Changed something? Re-check to update the score.</p>}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="What to fix" icon={<ListChecks />} subtitle={r ? `${r.findings.length} problem${r.findings.length === 1 ? "" : "s"} found` : "Run a check first"} />
          {r && r.findings.length === 0 && (
            <div className="flex items-center gap-3 px-5 py-6 text-sm text-emerald-800">
              <CheckCircle2 className="h-5 w-5" /> All 21 checks passed.
            </div>
          )}
          <div className="divide-y divide-border">
            {!r && (
              <div className="flex flex-col items-start gap-3 px-5 py-6 text-sm text-muted-foreground">
                21 checks run on every farm, farmer, collection, batch and document in this shipment, including the deforestation result.
                <Button size="sm" loading={assessing} icon={<RefreshCw className="h-4 w-4" />} onClick={assess}>
                  Check readiness
                </Button>
              </div>
            )}
            {grouped.map(({ sev, items }) =>
              items.map((f, i) => {
                const href = entityLink(f.entity_type, f.entity_id);
                return (
                  <div key={`${sev}-${i}`} className="flex gap-4 px-5 py-4">
                    <div className="pt-0.5">
                      <SeverityBadge severity={f.severity} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{f.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{humanize(f.message)}</p>
                      <p className="mt-1.5 text-sm text-primary">
                        <b>Fix:</b> {humanize(f.remediation)}
                      </p>
                    </div>
                    {href && (
                      <Link href={href} className="flex-none self-center rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" title={`Open ${f.entity_type}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                );
              }),
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Production plots"
            icon={<MapIcon />}
            subtitle={p ? `${p.dds_support.mapped_plot_count} of ${p.dds_support.plot_count} plots mapped · ${ha(p.dds_support.total_area_ha)}` : undefined}
            action={
              <Button
                size="sm"
                variant="secondary"
                icon={<MapIcon className="h-4 w-4" />}
                disabled={!p || p.geolocation.features.length === 0}
                onClick={() => downloadFile(`/api/v1/shipments/${id}/geolocation.geojson`, `${name}_plots.geojson`)}
              >
                GeoJSON for DDS
              </Button>
            }
          />
          <div className="p-4">
            <FarmMap
              height={340}
              satellite
              shapes={(p?.geolocation.features || []).map((ft) => ({
                id: String(ft.properties.FarmId),
                ring: ft.geometry.coordinates[0] as [number, number][],
                tone: riskTone(ft.properties.DeforestationRisk as never),
                label: `${ft.properties.FarmName || "Farm"} — ${ft.properties.ProducerName || ""}`,
                href: `/farms/${ft.properties.FarmId}`,
                lines: [`${ft.properties.Area ?? "—"} ha`, `${kg(Number(ft.properties.QuantityKgInShipment))} in this shipment`],
              }))}
            />
            <div className="mt-3">
              <MapLegend />
            </div>
            {p && p.unmapped_plots.length > 0 && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                Not mapped:{" "}
                {p.unmapped_plots.map((u, i) => (
                  <span key={u.farm_id}>
                    {i > 0 && ", "}
                    <Link href={`/farms/${u.farm_id}`} className="font-medium underline">
                      {u.farm_name || shortId(u.farm_id)}
                    </Link>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Evidence pack" subtitle="For your EU buyer's due diligence statement" />
          <div className="space-y-3 px-5 py-4 text-sm">
            <dl className="space-y-1.5">
              {[
                ["Net mass", kg(p?.dds_support.net_mass_kg)],
                ["HS code", s.hs_code],
                ["Country of production", "Nigeria (NG)"],
                ["Producers", p?.producers.length ?? "—"],
                [
                  "Deforestation screening",
                  p?.deforestation_screening.is_demo ? (
                    <Badge key="d" tone="violet">DEMO</Badge>
                  ) : p?.deforestation_screening.status === "performed" ? (
                    <Badge key="d" tone="green">Done</Badge>
                  ) : p?.deforestation_screening.status === "partial" ? (
                    <Badge key="d" tone="amber">Partial</Badge>
                  ) : (
                    <Badge key="d" tone="amber">Not run</Badge>
                  ),
                ],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-col gap-2 pt-2">
              <LinkButton href={`/shipments/${id}/evidence`} icon={<Printer className="h-4 w-4" />}>
                Open printable pack
              </LinkButton>
              <Button variant="secondary" icon={<FileJson className="h-4 w-4" />} disabled={!p} onClick={() => p && downloadJson(p, `${name}_evidence_pack.json`)}>
                Download JSON
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {p && p.deforestation_screening.plots.length > 0 && (
        <Card className="mt-6">
          <CardHeader
            title="Deforestation screening"
            icon={<Trees />}
            subtitle={`${p.deforestation_screening.summary.plots_screened} of ${p.deforestation_screening.summary.plots_mapped} mapped plots screened · cutoff 31 Dec 2020`}
            action={<ScreenButton shipmentId={id} label="Screen unscreened plots" size="sm" />}
          />
          {p.deforestation_screening.is_demo && (
            <p className="border-b bg-violet-50 px-5 py-2 text-sm text-violet-800">DEMO results — not a real satellite analysis. Don&apos;t send these to a buyer.</p>
          )}
          <Table head={["Plot", "Producer", "Result", "Tree cover 2020", "Farmland 2020", "Clearing after 2020"]}>
            {p.deforestation_screening.plots.map((pl) => (
              <Tr key={pl.farm_id}>
                <Td>
                  <Link href={`/farms/${pl.farm_id}`} className="font-medium hover:text-primary">
                    {pl.farm_name || shortId(pl.farm_id)}
                  </Link>
                </Td>
                <Td>{pl.farmer || "—"}</Td>
                <Td>
                  <RiskBadge risk={pl.risk} demo={pl.provider === "demo"} />
                </Td>
                <Td>{pl.indicators?.treecover_2020 ?? "—"}</Td>
                <Td>{pl.indicators?.commodities_2020 ?? "—"}</Td>
                <Td className={pl.indicators?.disturbance_after_2020 === "yes" ? "font-semibold text-red-700" : ""}>{pl.indicators?.disturbance_after_2020 ?? "—"}</Td>
              </Tr>
            ))}
          </Table>
        </Card>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Batches"
            subtitle={`${s.batch_count} batch${s.batch_count === 1 ? "" : "es"} · ${kg(s.net_mass_kg)}`}
            action={
              <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
                Add batches
              </Button>
            }
          />
          {p && p.chain_of_custody.length ? (
            <Table head={["Batch", "Output", "From", ""]}>
              {p.chain_of_custody.map((b) => (
                <Tr key={b.batch_id}>
                  <Td className="font-mono text-xs">
                    <Link href={`/batches#${b.batch_id}`} className="hover:text-primary">
                      {shortId(b.batch_id)}
                    </Link>
                  </Td>
                  <Td className="tabular-nums">{kg(b.batch_output_kg)}</Td>
                  <Td className="max-w-[16rem] truncate">{Array.from(new Set(b.inputs.map((i) => i.farmer || i.farm_name))).join(", ") || "—"}</Td>
                  <Td>
                    <button
                      className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-red-600"
                      title="Remove from shipment"
                      onClick={async () => {
                        await api(`/api/v1/shipments/${id}`, { method: "PATCH", body: { remove_batch_ids: [b.batch_id] } });
                        refreshAll();
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Td>
                </Tr>
              ))}
            </Table>
          ) : (
            <p className="px-5 py-5 text-sm text-muted-foreground">No batches yet.</p>
          )}
        </Card>
        <Card>
          <CardHeader
            title="Shipment documents"
            subtitle="Export and phytosanitary certificates"
            action={<UploadDocumentButton linkedType="shipment" linkedId={id} defaultType="export_certificate" onUploaded={refreshAll} />}
          />
          <DocumentList docs={docs.data} empty="No documents. An export certificate is required." />
        </Card>
      </div>

      {history.data && history.data.length > 1 && (
        <Card className="mt-6">
          <CardHeader title="Readiness history" />
          <Table head={["Checked", "Score", "Problems", "Status"]}>
            {history.data.map((h) => (
              <Tr key={h.id}>
                <Td>{dateTime(h.computed_at)}</Td>
                <Td className="font-semibold tabular-nums">{h.score}</Td>
                <Td>{h.finding_count}</Td>
                <Td>
                  <StatusBadge score={h.score} blocked={h.is_blocked} />
                </Td>
              </Tr>
            ))}
          </Table>
        </Card>
      )}
      {adding && <AddBatches shipment={s} onClose={() => setAdding(false)} onSaved={refreshAll} />}
    </>
  );
}
