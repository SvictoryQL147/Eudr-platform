"use client";

import { ArrowRight, CalendarClock, CheckCircle2, Circle, Map as MapIcon, Package, Ship, Trees, TriangleAlert, UsersRound } from "lucide-react";
import Link from "next/link";
import { Badge, Card, CardHeader, Empty, ErrorBox, PageHeader, PageLoading, SeverityBadge, Stat, StatusBadge, Table, Td, Tr } from "@/components/kit";
import FarmMap from "@/components/Map";
import MapLegend from "@/components/MapLegend";
import { ScreenButton } from "@/components/Screening";
import { Progress } from "@/components/ui/progress";
import { date, ha, kg, riskTone, tonnes } from "@/lib/format";
import type { DashboardSummary, Farm, ScreeningStatus, Shipment } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";

function RiskBar({ d }: { d: DashboardSummary["deforestation"] }) {
  const total = d.low + d.more_info_needed + d.high + d.not_screened;
  const parts = [
    { k: "Low risk", v: d.low, c: "bg-emerald-500" },
    { k: "Needs evidence", v: d.more_info_needed, c: "bg-amber-400" },
    { k: "High risk", v: d.high, c: "bg-red-500" },
    { k: "Not screened", v: d.not_screened, c: "bg-stone-300" },
  ];
  if (!total) return <p className="text-sm text-muted-foreground">No mapped plots yet.</p>;
  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
        {parts.map((p) => p.v > 0 && <div key={p.k} className={p.c} style={{ width: `${(100 * p.v) / total}%` }} title={`${p.k}: ${p.v}`} />)}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {parts.map((p) => (
          <div key={p.k} className="flex items-center justify-between gap-2 rounded-md bg-secondary/60 px-2.5 py-1.5">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${p.c}`} /> {p.k}
            </span>
            <span className="font-semibold tabular-nums">{p.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const summary = useApi<DashboardSummary>("/api/v1/dashboard/summary");
  const shipments = useApi<Shipment[]>("/api/v1/shipments");
  const farms = useApi<Farm[]>("/api/v1/farms?mapped=true");
  const screening = useApi<ScreeningStatus>("/api/v1/screening/status");

  if (summary.loading) return <PageLoading />;
  if (summary.error) return <ErrorBox message={summary.error} />;
  const s = summary.data!;
  const d = s.deforestation;

  const steps = [
    { done: s.farmers > 0, label: "Register your farmers", href: "/farmers" },
    { done: s.farms > 0 && s.mapped_farms === s.farms, label: "Map every farm boundary", href: "/farms" },
    { done: s.mapped_farms > 0 && d.not_screened === 0, label: "Screen every plot for deforestation", href: "/farms" },
    { done: s.collected_kg > 0, label: "Record harvests and collections", href: "/collections" },
    { done: s.shipments > 0, label: "Batch collections into a shipment", href: "/shipments" },
    { done: s.shipments_ready > 0, label: "Get a shipment to Ready", href: "/shipments" },
  ];
  const doneCount = steps.filter((x) => x.done).length;
  const deadlinePct = Math.max(0, Math.min(100, 100 - (s.days_to_deadline / 365) * 100));

  return (
    <>
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-[#06261b] px-5 py-6 text-white shadow-lg animate-fade-up sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(40rem_22rem_at_0%_0%,rgba(31,191,106,.38),transparent_60%),radial-gradient(30rem_20rem_at_100%_120%,rgba(199,245,166,.16),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:36px_36px]" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="text-sm text-emerald-200/80">
              {greeting()}, {user?.name.split(" ")[0]}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">{s.organization_name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/10">
                {doneCount} of {steps.length} setup steps done
              </span>
              {screening.data?.demo && <span className="rounded-full bg-violet-400/20 px-2.5 py-1 text-violet-100 ring-1 ring-violet-300/30">Screening: DEMO mode</span>}
            </div>
          </div>
          <div className="w-full max-w-xs rounded-xl bg-white/[0.07] p-4 ring-1 ring-white/10 backdrop-blur">
            <div className="flex items-center gap-2 text-xs text-emerald-100/80">
              <CalendarClock className="h-4 w-4 text-emerald-300" /> EUDR applies from {date(s.eudr_deadline)}
            </div>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums">{s.days_to_deadline > 0 ? `${s.days_to_deadline} days to go` : "In force now"}</p>
            <Progress value={deadlinePct} className="mt-3 h-1.5 bg-white/15" indicatorClassName="bg-gradient-to-r from-emerald-300 to-lime-200" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Farmers" icon={<UsersRound />} value={s.farmers} sub={`${s.farms} farms registered`} />
        <Stat label="Farms mapped" icon={<MapIcon />} value={`${s.mapped_pct}%`} sub={`${s.mapped_farms} of ${s.farms} · ${ha(s.total_hectares)}`} tone={s.farms && s.mapped_pct < 100 ? "amber" : undefined} />
        <Stat label="Cocoa collected" icon={<Package />} value={tonnes(s.collected_kg)} sub={kg(s.collected_kg)} />
        <Stat label="Average readiness" icon={<Ship />} value={s.average_score ?? "—"} sub={`${s.shipments_ready} ready · ${s.shipments_blocked} blocked · ${s.shipments_not_assessed} unchecked`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Shipments"
            subtitle="Latest readiness for each shipment"
            icon={<Ship />}
            action={
              <Link href="/shipments" className="text-sm font-medium text-primary hover:underline">
                View all
              </Link>
            }
          />
          {shipments.data && shipments.data.length > 0 ? (
            <Table head={["Shipment", "Buyer", "Net mass", "Score", "Status"]}>
              {shipments.data.slice(0, 6).map((sh) => (
                <Tr key={sh.id}>
                  <Td>
                    <Link href={`/shipments/${sh.id}`} className="font-medium hover:text-primary">
                      {sh.reference || sh.id.slice(0, 8)}
                    </Link>
                    <div className="text-xs text-muted-foreground">{sh.destination_country || "No destination"}</div>
                  </Td>
                  <Td>{sh.buyer_name || "—"}</Td>
                  <Td className="tabular-nums">{kg(sh.net_mass_kg)}</Td>
                  <Td className="font-semibold tabular-nums">{sh.latest_score ?? "—"}</Td>
                  <Td>
                    <StatusBadge score={sh.latest_score} blocked={sh.is_blocked} />
                  </Td>
                </Tr>
              ))}
            </Table>
          ) : (
            <Empty icon={<Ship />} title="No shipments yet" body="Create a shipment from your batches to get a readiness score." />
          )}
        </Card>

        <div>
          <Card className="h-full">
            <CardHeader title="Most common problems" subtitle="Across latest assessments" icon={<TriangleAlert />} />
            {s.top_issues.length ? (
              <ul className="divide-y">
                {s.top_issues.map((i) => (
                  <li key={i.rule_id} className="flex items-start justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{i.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.shipments} shipment{i.shipments === 1 ? "" : "s"}
                      </p>
                    </div>
                    <SeverityBadge severity={i.severity} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-muted-foreground">No open problems on assessed shipments.</p>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Plot map"
            subtitle={`${s.mapped_farms} plots · ${ha(s.total_hectares)}`}
            icon={<MapIcon />}
            action={<MapLegend />}
          />
          <div className="p-4">
            <FarmMap
              height={560}
              satellite
              shapes={(farms.data || []).map((f) => ({
                id: f.id,
                ring: f.polygon_ring!,
                tone: riskTone(f.deforestation_risk, f.polygon_is_valid),
                label: `${f.name || "Farm"} — ${f.farmer_name || "no farmer"}`,
                href: `/farms/${f.id}`,
                lines: [ha(f.area_hectares), `${kg(f.collected_kg)} collected`],
              }))}
            />
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Deforestation screening" subtitle={`${s.mapped_farms} mapped plot${s.mapped_farms === 1 ? "" : "s"}`} icon={<Trees />} />
            <div className="space-y-4 p-5">
              <RiskBar d={d} />
              {d.high > 0 && (
                <p className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
                  <TriangleAlert className="mt-0.5 h-4 w-4 flex-none" /> {d.high} plot{d.high === 1 ? "" : "s"} show clearing after 2020.
                </p>
              )}
              {d.not_screened > 0 && <ScreenButton label={`Screen ${d.not_screened} plot${d.not_screened === 1 ? "" : "s"}`} size="sm" />}
            </div>
          </Card>
          <Card>
            <CardHeader title="Setup" subtitle={`${doneCount} of ${steps.length} done`} />
            <div className="px-5 pt-3">
              <Progress value={(100 * doneCount) / steps.length} />
            </div>
            <ol className="space-y-0.5 p-3">
              {steps.map((st) => (
                <li key={st.label}>
                  <Link href={st.href} className="group flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-secondary">
                    {st.done ? <CheckCircle2 className="h-5 w-5 flex-none text-emerald-600" /> : <Circle className="h-5 w-5 flex-none text-stone-300" />}
                    <span className={st.done ? "text-muted-foreground line-through" : ""}>{st.label}</span>
                    {!st.done && <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
