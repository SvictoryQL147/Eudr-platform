"use client";

import { Printer } from "lucide-react";
import FarmMap from "@/components/Map";
import { Button, ErrorBox, PageHeader, PageLoading } from "@/components/kit";
import { APP_NAME } from "@/lib/api";
import { DOCUMENT_LABELS, date, dateTime, ha, kg, shortId } from "@/lib/format";
import type { DocumentType, EvidencePack } from "@/lib/types";
import { useApi } from "@/lib/useApi";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 border-b border-border pb-1 text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function KV({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 border-b border-dotted border-border py-1">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="text-right font-medium text-foreground">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const th = "border-b border-border px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground";
const td = "border-b border-border px-2 py-1.5 align-top";

export default function EvidencePage({ params }: { params: { id: string } }) {
  const { data: p, error, loading } = useApi<EvidencePack>(`/api/v1/shipments/${params.id}/evidence-pack`);
  if (loading) return <PageLoading />;
  if (error) return <ErrorBox message={error} />;
  if (!p) return null;
  const a = p.compliance_assessment;
  const title = p.shipment.reference || shortId(p.shipment.id);

  return (
    <>
      <div className="no-print">
        <PageHeader
          back={{ href: `/shipments/${params.id}`, label: "Shipment" }}
          title="Evidence pack"
          subtitle="Print or save as PDF and send to your buyer with the GeoJSON file."
          actions={
            <Button icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
              Print / Save as PDF
            </Button>
          }
        />
      </div>

      <article className="mx-auto max-w-4xl rounded-xl border border-border bg-white px-6 py-8 shadow-card sm:px-10 print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-stone-900 pb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">EUDR supplier evidence pack</p>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">Shipment {title}</h1>
            <p className="text-sm text-muted-foreground">
              From {p.exporter?.name} to {p.shipment.buyer_name || "—"} ({p.shipment.destination_country || "—"})
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Generated {dateTime(p.generated_at)}</p>
            <p>by {APP_NAME}</p>
          </div>
        </header>

        <Section title="1. Product and quantity">
          <KV
            rows={[
              ["Commodity", p.dds_support.description],
              ["HS code", p.shipment.hs_code],
              ["Net mass", kg(p.dds_support.net_mass_kg)],
              ["Country of production", "Nigeria (NG)"],
              ["Production plots", `${p.dds_support.plot_count} (${p.dds_support.mapped_plot_count} with geolocation)`],
              ["Total plot area", ha(p.dds_support.total_area_ha)],
            ]}
          />
          <p className="mt-3 text-xs text-muted-foreground">{p.dds_support.note}</p>
        </Section>

        <Section title="2. Traceability check">
          {a ? (
            <>
              <KV
                rows={[
                  ["Readiness score", `${a.readiness_score} / 100`],
                  ["Status", a.is_blocked ? "BLOCKED — critical issues open" : "Not blocked"],
                  ["Checked", dateTime(a.computed_at)],
                  ["Method", a.rules_engine],
                ]}
              />
              {a.findings.length > 0 ? (
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr>
                      <th className={th}>Severity</th>
                      <th className={th}>Issue</th>
                      <th className={th}>Remediation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.findings.map((f, i) => (
                      <tr key={i}>
                        <td className={td + " capitalize"}>{f.severity}</td>
                        <td className={td}>
                          <b>{f.title}</b>
                          <div className="text-muted-foreground">{f.message.replace(UUID, (m) => shortId(m))}</div>
                        </td>
                        <td className={td}>{f.remediation.replace(UUID, (m) => shortId(m))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="mt-3 text-sm font-medium text-emerald-800">All 21 traceability, data-integrity and deforestation checks passed.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No readiness check has been run for this shipment.</p>
          )}
        </Section>

        <Section title="3. Deforestation screening">
          {(() => {
            const ds = p.deforestation_screening;
            const label = { performed: "Performed for every mapped plot", partial: "Partial — some plots not screened", not_performed: "Not performed" }[ds.status];
            return (
              <>
                {ds.is_demo && (
                  <p className="mb-3 rounded-md border-2 border-violet-400 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-900">
                    DEMO RESULTS — generated for demonstration only, not a real satellite analysis. Do not send to a buyer.
                  </p>
                )}
                <KV
                  rows={[
                    ["Status", label],
                    ["Method", ds.method || "—"],
                    ["Cutoff date", date(ds.cutoff_date)],
                    ["Plots screened", `${ds.summary.plots_screened} of ${ds.summary.plots_mapped} mapped`],
                    ["Low risk", ds.summary.low],
                    ["Needs evidence / High risk", `${ds.summary.more_info_needed} / ${ds.summary.high}`],
                  ]}
                />
                <p className="mt-3 text-sm text-stone-700">{ds.note}</p>
                {ds.plots.length > 0 && (
                  <table className="mt-3 w-full text-sm">
                    <thead>
                      <tr>
                        <th className={th}>Plot / producer</th>
                        <th className={th}>Result</th>
                        <th className={th}>Tree cover 2020</th>
                        <th className={th}>Farmland 2020</th>
                        <th className={th}>Clearing after 2020</th>
                        <th className={th}>Screened</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ds.plots.map((pl) => (
                        <tr key={pl.farm_id}>
                          <td className={td}>
                            {pl.farm_name || shortId(pl.farm_id)} · {pl.farmer || "—"}
                          </td>
                          <td className={td + " font-medium"}>
                            {pl.risk ? { low: "Low risk", more_info_needed: "Needs evidence", high: "HIGH RISK" }[pl.risk] : "Not screened"}
                            {pl.provider === "demo" && " (DEMO)"}
                          </td>
                          <td className={td}>{pl.indicators?.treecover_2020 ?? "—"}</td>
                          <td className={td}>{pl.indicators?.commodities_2020 ?? "—"}</td>
                          <td className={td}>{pl.indicators?.disturbance_after_2020 ?? "—"}</td>
                          <td className={td}>{date(pl.screened_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            );
          })()}
        </Section>

        <Section title="4. Plot geolocation">
          <div className="print:break-inside-avoid">
            <FarmMap
              height={360}
              satellite
              shapes={p.geolocation.features.map((ft) => ({
                id: String(ft.properties.FarmId),
                ring: ft.geometry.coordinates[0] as [number, number][],
                label: String(ft.properties.ProducerName || ft.properties.FarmName || ""),
              }))}
            />
          </div>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Producer</th>
                <th className={th}>Place</th>
                <th className={th}>Area</th>
                <th className={th}>Kg in shipment</th>
                <th className={th}>Centre (lat, lon)</th>
              </tr>
            </thead>
            <tbody>
              {p.geolocation.features.map((ft) => {
                const ring = ft.geometry.coordinates[0];
                const pts = ring.slice(0, -1);
                const lat = pts.reduce((s, c) => s + c[1], 0) / pts.length;
                const lon = pts.reduce((s, c) => s + c[0], 0) / pts.length;
                return (
                  <tr key={String(ft.properties.FarmId)}>
                    <td className={td}>{ft.properties.ProducerName || "—"}</td>
                    <td className={td}>{ft.properties.ProductionPlace || "—"}</td>
                    <td className={td}>{ha(Number(ft.properties.Area))}</td>
                    <td className={td}>{kg(Number(ft.properties.QuantityKgInShipment))}</td>
                    <td className={td + " font-mono text-xs"}>
                      {lat.toFixed(6)}, {lon.toFixed(6)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {p.unmapped_plots.length > 0 && (
            <p className="mt-2 text-sm text-red-700">
              {p.unmapped_plots.length} plot(s) have no geolocation: {p.unmapped_plots.map((u) => u.farm_name || u.farmer || shortId(u.farm_id)).join(", ")}.
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Full polygons (WGS84, 6 decimals) are in the accompanying GeoJSON file.</p>
        </Section>

        <Section title="5. Chain of custody">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Batch</th>
                <th className={th}>Farm / producer</th>
                <th className={th}>Collected</th>
                <th className={th}>Kg</th>
              </tr>
            </thead>
            <tbody>
              {p.chain_of_custody.flatMap((b) =>
                b.inputs.map((i, n) => (
                  <tr key={b.batch_id + i.collection_event_id}>
                    <td className={td + " font-mono text-xs"}>{n === 0 ? `${shortId(b.batch_id)} (${kg(b.batch_output_kg)})` : ""}</td>
                    <td className={td}>
                      {i.farm_name || "—"} · {i.farmer || "—"}
                    </td>
                    <td className={td}>{date(i.collected_at)}</td>
                    <td className={td}>{kg(i.quantity_kg)}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </Section>

        <Section title="6. Supporting documents">
          {p.documents.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {p.documents.map((d) => (
                <li key={d.id}>
                  {DOCUMENT_LABELS[d.type as DocumentType] || d.type} — {d.filename || "external file"}
                  {d.expiry_date && <> (expires {date(d.expiry_date)})</>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None attached.</p>
          )}
        </Section>

        <footer className="mt-10 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
          <p>
            Integrity: SHA-256 <span className="break-all font-mono">{p.content_sha256}</span>. The hash covers every field in the JSON pack except the
            generation time; any change to the data produces a different hash.
          </p>
          <p className="mt-1">
            This pack supplies information for the EU operator&apos;s due diligence under Regulation (EU) 2023/1115. It is not itself a due diligence
            statement. Deforestation screening is a satellite-based risk indication (Whisp convergence of evidence), not a certification of
            deforestation-free status.
          </p>
        </footer>
      </article>
    </>
  );
}
