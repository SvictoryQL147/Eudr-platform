"use client";

import { Pencil, Plus, ShieldCheck, Trees } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CollectionForm, HarvestForm } from "@/components/FieldForms";
import FarmForm from "@/components/FarmForm";
import { Badge, Button, Card, CardHeader, ErrorBox, PageHeader, PageLoading, Stat, Table, Td, Tr } from "@/components/kit";
import FarmMap from "@/components/Map";
import { IndicatorList, RiskBadge, ScreenButton, ScreenedLine } from "@/components/Screening";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { date, dateTime, ha, kg, riskTone } from "@/lib/format";
import type { CollectionEvent, Farm, Farmer, Harvest, ScreeningHistoryItem } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const RISK_EXPLAIN = {
  low: "Satellite evidence shows no forest clearing on this plot after 2020 (or it was already farmland). Fine for EUDR.",
  more_info_needed:
    "There was tree cover at the end of 2020 and no map shows farmland then. Common for shade-grown cocoa — collect proof the farm existed before 2021.",
  high: "Tree cover at the end of 2020 and clearing after it. Cocoa from this plot can't go to the EU unless a field check proves otherwise.",
} as const;

export default function FarmDetail({ params }: { params: { id: string } }) {
  const farm = useApi<Farm>(`/api/v1/farms/${params.id}`);
  const farmers = useApi<Farmer[]>("/api/v1/farmers");
  const harvests = useApi<Harvest[]>(`/api/v1/harvests?farm_id=${params.id}`);
  const collections = useApi<CollectionEvent[]>(`/api/v1/collection-events?farm_id=${params.id}`);
  const history = useApi<ScreeningHistoryItem[]>(`/api/v1/screening/farms/${params.id}`);
  const [editing, setEditing] = useState(false);
  const [addHarvest, setAddHarvest] = useState(false);
  const [addCollection, setAddCollection] = useState(false);

  if (farm.loading) return <PageLoading />;
  if (farm.error) return <ErrorBox message={farm.error} />;
  const f = farm.data!;
  const overCollected = f.harvested_kg > 0 && f.collected_kg > f.harvested_kg * 1.1;

  return (
    <>
      <PageHeader
        back={{ href: "/farms", label: "Farms" }}
        title={f.name || `Farm ${f.id.slice(0, 8)}`}
        badge={f.has_geolocation && <RiskBadge risk={f.deforestation_risk} outdated={f.screening_outdated} demo={f.screening_provider === "demo"} />}
        subtitle={
          f.farmer_id ? (
            <>
              Farmer:{" "}
              <Link href={`/farmers/${f.farmer_id}`} className="font-medium text-primary hover:underline">
                {f.farmer_name}
              </Link>
            </>
          ) : (
            "No farmer linked"
          )
        }
        actions={
          <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>
            {f.has_geolocation ? "Edit boundary" : "Map boundary"}
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Area" value={ha(f.area_hectares)} />
        <Stat
          label="Boundary"
          value={f.has_geolocation ? (f.polygon_is_valid === false ? "Invalid" : "Mapped") : "Missing"}
          tone={f.has_geolocation && f.polygon_is_valid !== false ? "green" : "red"}
          sub={f.centroid ? `${f.centroid[1].toFixed(5)}, ${f.centroid[0].toFixed(5)}` : "Needed for EUDR"}
        />
        <Stat label="Harvested (reported)" value={kg(f.harvested_kg)} />
        <Stat label="Collected (weighed)" value={kg(f.collected_kg)} tone={overCollected ? "red" : undefined} sub={overCollected ? "More than 10% above harvest" : undefined} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="p-4">
            {f.polygon_ring ? (
              <FarmMap height={420} satellite shapes={[{ id: f.id, ring: f.polygon_ring, label: f.name || "Farm", tone: riskTone(f.deforestation_risk, f.polygon_is_valid) }]} />
            ) : (
              <div className="rounded-xl border border-dashed border-red-300 bg-red-50/50 px-6 py-16 text-center">
                <p className="font-medium text-red-800">This farm has no boundary yet</p>
                <p className="mt-1 text-sm text-red-700">Shipments with cocoa from this farm are blocked until it&apos;s mapped.</p>
                <Button className="mt-4" onClick={() => setEditing(true)}>
                  Map boundary now
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Deforestation check" subtitle="Was this plot forest at the end of 2020, and cleared since?" icon={<Trees />} />
          <div className="space-y-4 p-5">
            {!f.has_geolocation ? (
              <p className="text-sm text-muted-foreground">Map the boundary first — screening needs the plot shape.</p>
            ) : f.deforestation_risk ? (
              <>
                <div className="flex items-center gap-2">
                  <RiskBadge risk={f.deforestation_risk} demo={f.screening_provider === "demo"} />
                </div>
                <p className="text-sm">{RISK_EXPLAIN[f.deforestation_risk]}</p>
                <IndicatorList indicators={f.screening_indicators} />
                <ScreenedLine at={f.screened_at} provider={f.screening_provider} />
              </>
            ) : (
              <div className="space-y-3">
                <RiskBadge risk={null} outdated={f.screening_outdated} />
                <p className="text-sm text-muted-foreground">
                  {f.screening_outdated
                    ? "The boundary was redrawn after the last check, so that result no longer counts."
                    : "Not checked yet. It takes a minute and uses free public satellite data."}
                </p>
              </div>
            )}
            {f.has_geolocation && (
              <ScreenButton farmIds={[f.id]} onlyUnscreened={false} label={f.deforestation_risk ? "Screen again" : "Screen this plot"} size="sm" variant={f.deforestation_risk ? "secondary" : "primary"} />
            )}
            {history.data && history.data.length > 1 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground">Previous checks ({history.data.length - 1})</summary>
                <ul className="mt-2 space-y-1.5">
                  {history.data.slice(1).map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">
                        {date(h.screened_at)}
                        {!h.current_boundary && " · old boundary"}
                      </span>
                      <RiskBadge risk={h.risk} demo={h.provider === "demo"} />
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <Tabs defaultValue="collections">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <TabsList>
              <TabsTrigger value="collections">Collections {collections.data?.length ?? ""}</TabsTrigger>
              <TabsTrigger value="harvests">Harvests {harvests.data?.length ?? ""}</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setAddHarvest(true)}>
                Harvest
              </Button>
              <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setAddCollection(true)}>
                Collection
              </Button>
            </div>
          </div>
          <TabsContent value="collections" className="mt-0">
            {collections.data && collections.data.length ? (
              <Table head={["When", "Weight", "Agent", "GPS", "In batches"]}>
                {collections.data.map((c) => (
                  <Tr key={c.id}>
                    <Td>{dateTime(c.collected_at || c.created_at)}</Td>
                    <Td className="tabular-nums">{kg(c.weight_kg)}</Td>
                    <Td>{c.agent_name || <Badge tone="amber">No agent</Badge>}</Td>
                    <Td>{c.location_recorded ? <Badge tone="green">Yes</Badge> : <Badge tone="amber">No</Badge>}</Td>
                    <Td className="tabular-nums">{kg(c.batched_kg)}</Td>
                  </Tr>
                ))}
              </Table>
            ) : (
              <p className="px-5 py-6 text-sm text-muted-foreground">No collections recorded.</p>
            )}
          </TabsContent>
          <TabsContent value="harvests" className="mt-0">
            {harvests.data && harvests.data.length ? (
              <Table head={["Date", "Quantity"]}>
                {harvests.data.map((h) => (
                  <Tr key={h.id}>
                    <Td>{h.harvest_date ? date(h.harvest_date) : <Badge tone="amber">No date</Badge>}</Td>
                    <Td className="tabular-nums">{kg(h.quantity_kg)}</Td>
                  </Tr>
                ))}
              </Table>
            ) : (
              <p className="px-5 py-6 text-sm text-muted-foreground">No harvests recorded.</p>
            )}
          </TabsContent>
        </Tabs>
      </Card>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> Redrawing the boundary clears its deforestation result until it&apos;s screened again.
      </p>

      {editing && <FarmForm open farm={f} farmers={farmers.data || []} onClose={() => setEditing(false)} onSaved={() => undefined} />}
      {addHarvest && <HarvestForm open farmId={f.id} onClose={() => setAddHarvest(false)} onSaved={() => undefined} />}
      {addCollection && <CollectionForm open farmId={f.id} onClose={() => setAddCollection(false)} onSaved={() => undefined} />}
    </>
  );
}
