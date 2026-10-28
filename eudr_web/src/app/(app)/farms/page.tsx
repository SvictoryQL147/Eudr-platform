"use client";

import { Map as MapIcon, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { type ColMeta, type ColumnDef, DataTable, SortHeader } from "@/components/DataTable";
import FarmForm from "@/components/FarmForm";
import { Badge, Button, Card, CardHeader, Empty, ErrorBox, Loading, PageHeader } from "@/components/kit";
import FarmMap from "@/components/Map";
import MapLegend from "@/components/MapLegend";
import { RISK_LABEL, RiskBadge, ScreenButton } from "@/components/Screening";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ha, kg, riskTone } from "@/lib/format";
import type { Farm, Farmer, ScreeningStatus } from "@/lib/types";
import { useApi } from "@/lib/useApi";

type Filter = "all" | "unmapped" | "unscreened" | "flagged";

function FarmsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const farms = useApi<Farm[]>("/api/v1/farms");
  const farmers = useApi<Farmer[]>("/api/v1/farmers");
  const screening = useApi<ScreeningStatus>("/api/v1/screening/status");
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  useEffect(() => {
    if (params.get("new")) setAdding(true);
  }, [params]);

  const all = farms.data || [];
  const counts = {
    unmapped: all.filter((f) => !f.has_geolocation).length,
    unscreened: all.filter((f) => f.has_geolocation && !f.deforestation_risk).length,
    flagged: all.filter((f) => f.deforestation_risk === "high" || f.deforestation_risk === "more_info_needed").length,
  };
  const list = all.filter((f) =>
    filter === "unmapped"
      ? !f.has_geolocation
      : filter === "unscreened"
        ? f.has_geolocation && !f.deforestation_risk
        : filter === "flagged"
          ? f.deforestation_risk === "high" || f.deforestation_risk === "more_info_needed"
          : true,
  );
  const demo = !!screening.data?.demo;

  const shapes = all
    .filter((f) => f.polygon_ring)
    .map((f) => ({
      id: f.id,
      ring: f.polygon_ring!,
      label: `${f.name || "Farm"} — ${f.farmer_name || "no farmer"}`,
      href: `/farms/${f.id}`,
      tone: riskTone(f.deforestation_risk, f.polygon_is_valid),
      lines: [ha(f.area_hectares), f.deforestation_risk ? RISK_LABEL[f.deforestation_risk] : "Not screened", `${kg(f.collected_kg)} collected`],
    }));

  const columns = useMemo<ColumnDef<Farm, unknown>[]>(
    () => [
      {
        id: "farm",
        accessorFn: (f) => f.name || f.id,
        header: ({ column }) => <SortHeader column={column}>Farm</SortHeader>,
        cell: ({ row: { original: f } }) => (
          <Link href={`/farms/${f.id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:text-primary">
            {f.name || f.id.slice(0, 8)}
          </Link>
        ),
        meta: { label: "Farm", csv: (f) => f.name } as ColMeta<Farm>,
        enableHiding: false,
      },
      {
        id: "farmer",
        accessorFn: (f) => f.farmer_name || "",
        header: ({ column }) => <SortHeader column={column}>Farmer</SortHeader>,
        cell: ({ row: { original: f } }) => f.farmer_name || <Badge tone="orange">No farmer</Badge>,
        meta: { label: "Farmer", csv: (f) => f.farmer_name } as ColMeta<Farm>,
      },
      {
        id: "boundary",
        accessorFn: (f) => (f.has_geolocation ? (f.polygon_is_valid === false ? 1 : 2) : 0),
        header: ({ column }) => <SortHeader column={column}>Boundary</SortHeader>,
        cell: ({ row: { original: f } }) =>
          !f.has_geolocation ? <Badge tone="red">Not mapped</Badge> : f.polygon_is_valid === false ? <Badge tone="red">Invalid shape</Badge> : <Badge tone="green">Mapped</Badge>,
        meta: { label: "Boundary", csv: (f) => (f.has_geolocation ? "mapped" : "not mapped") } as ColMeta<Farm>,
      },
      {
        id: "risk",
        accessorFn: (f) => ({ high: 0, more_info_needed: 1, low: 3 } as Record<string, number>)[f.deforestation_risk || ""] ?? 2,
        header: ({ column }) => <SortHeader column={column}>Deforestation</SortHeader>,
        cell: ({ row: { original: f } }) =>
          f.has_geolocation ? <RiskBadge risk={f.deforestation_risk} outdated={f.screening_outdated} demo={f.screening_provider === "demo"} /> : <span className="text-muted-foreground">—</span>,
        meta: { label: "Deforestation risk", csv: (f) => f.deforestation_risk ?? "not screened" } as ColMeta<Farm>,
      },
      {
        id: "area",
        accessorKey: "area_hectares",
        header: ({ column }) => <SortHeader column={column} align="right">Area</SortHeader>,
        cell: ({ getValue }) => ha(getValue() as number),
        meta: { label: "Area (ha)", align: "right", csv: (f) => f.area_hectares } as ColMeta<Farm>,
      },
      {
        id: "collected",
        accessorKey: "collected_kg",
        header: ({ column }) => <SortHeader column={column} align="right">Collected</SortHeader>,
        cell: ({ getValue }) => kg(getValue() as number),
        meta: { label: "Collected (kg)", align: "right", csv: (f) => f.collected_kg } as ColMeta<Farm>,
      },
    ],
    [],
  );

  if (farms.loading) return <Loading />;

  return (
    <>
      <PageHeader
        title="Farms & maps"
        subtitle="Every plot your cocoa comes from, its boundary and its deforestation check"
        badge={demo ? <Badge tone="violet">Screening: DEMO mode</Badge> : undefined}
        actions={
          <>
            <ScreenButton label={counts.unscreened ? `Screen ${counts.unscreened} unscreened` : "Screen farms"} />
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>
              Add farm
            </Button>
          </>
        }
      />
      {farms.error && <ErrorBox message={farms.error} />}
      {counts.unmapped > 0 && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <b>{counts.unmapped} farm{counts.unmapped === 1 ? " has" : "s have"} no boundary.</b> Any shipment containing their cocoa is blocked until they&apos;re mapped.
        </div>
      )}
      <Card className="mb-6">
        <CardHeader title="Plot map" subtitle={`${shapes.length} mapped plot${shapes.length === 1 ? "" : "s"}`} icon={<MapIcon />} action={<MapLegend />} />
        <div className="p-4">
          {shapes.length ? (
            <FarmMap shapes={shapes} height={460} satellite />
          ) : (
            <Empty icon={<MapIcon />} title="No mapped farms yet" body="Add a farm and draw or walk its boundary." />
          )}
        </div>
      </Card>
      <Card>
        <div className="px-4 pt-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              <TabsTrigger value="all">All {all.length}</TabsTrigger>
              <TabsTrigger value="unmapped">Not mapped {counts.unmapped}</TabsTrigger>
              <TabsTrigger value="unscreened">Not screened {counts.unscreened}</TabsTrigger>
              <TabsTrigger value="flagged">Flagged {counts.flagged}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <DataTable data={list} columns={columns} onRowClick={(f) => router.push(`/farms/${f.id}`)} searchPlaceholder="Search farm or farmer…" csvName="farms" />
      </Card>
      {adding && (
        <FarmForm
          open
          farmers={farmers.data || []}
          defaultFarmerId={params.get("farmer")}
          context={shapes}
          onClose={() => {
            setAdding(false);
            if (params.get("new")) router.replace("/farms");
          }}
          onSaved={(f) => router.push(`/farms/${f.id}`)}
        />
      )}
    </>
  );
}

export default function FarmsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <FarmsInner />
    </Suspense>
  );
}
