"use client";

import { Plus, Scale } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { type ColMeta, type ColumnDef, DataTable, SortHeader } from "@/components/DataTable";
import { CollectionForm, HarvestForm } from "@/components/FieldForms";
import { Badge, Button, Card, Empty, Loading, PageHeader } from "@/components/kit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { date, dateTime, kg } from "@/lib/format";
import type { CollectionEvent, Harvest } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const farmLink = (id: string, name: string | null) => (
  <Link href={`/farms/${id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:text-primary">
    {name || id.slice(0, 8)}
  </Link>
);

export default function CollectionsPage() {
  const harvests = useApi<Harvest[]>("/api/v1/harvests");
  const collections = useApi<CollectionEvent[]>("/api/v1/collection-events");
  const [addH, setAddH] = useState(false);
  const [addC, setAddC] = useState(false);
  const unbatched = (collections.data || []).reduce((s, c) => s + c.available_kg, 0);

  const cCols = useMemo<ColumnDef<CollectionEvent, unknown>[]>(
    () => [
      { id: "when", accessorFn: (c) => c.collected_at || c.created_at || "", header: ({ column }) => <SortHeader column={column}>Collected</SortHeader>, cell: ({ row: { original: c } }) => dateTime(c.collected_at || c.created_at), meta: { label: "Collected", csv: (c) => c.collected_at || c.created_at } as ColMeta<CollectionEvent> },
      { id: "farm", accessorFn: (c) => c.farm_name || "", header: ({ column }) => <SortHeader column={column}>Farm</SortHeader>, cell: ({ row: { original: c } }) => farmLink(c.farm_id, c.farm_name), meta: { label: "Farm", csv: (c) => c.farm_name } as ColMeta<CollectionEvent> },
      { id: "farmer", accessorFn: (c) => c.farmer_name || "", header: ({ column }) => <SortHeader column={column}>Farmer</SortHeader>, cell: ({ getValue }) => (getValue() as string) || "—", meta: { label: "Farmer", csv: (c) => c.farmer_name } as ColMeta<CollectionEvent> },
      { id: "weight", accessorKey: "weight_kg", header: ({ column }) => <SortHeader column={column} align="right">Weight</SortHeader>, cell: ({ getValue }) => kg(getValue() as number), meta: { label: "Weight (kg)", align: "right", csv: (c) => c.weight_kg } as ColMeta<CollectionEvent> },
      { id: "agent", accessorFn: (c) => c.agent_name || "", header: "Agent", cell: ({ row: { original: c } }) => c.agent_name || <Badge tone="amber">Missing</Badge>, meta: { label: "Agent", csv: (c) => c.agent_name } as ColMeta<CollectionEvent> },
      { id: "gps", accessorKey: "location_recorded", header: "GPS", cell: ({ getValue }) => (getValue() ? <Badge tone="green">Yes</Badge> : <Badge tone="amber">No</Badge>), meta: { label: "GPS", csv: (c) => (c.location_recorded ? "yes" : "no") } as ColMeta<CollectionEvent> },
      { id: "batched", accessorKey: "batched_kg", header: ({ column }) => <SortHeader column={column} align="right">Batched</SortHeader>, cell: ({ getValue }) => kg(getValue() as number), meta: { label: "Batched (kg)", align: "right", csv: (c) => c.batched_kg } as ColMeta<CollectionEvent> },
      { id: "avail", accessorKey: "available_kg", header: ({ column }) => <SortHeader column={column} align="right">Available</SortHeader>, cell: ({ getValue }) => ((getValue() as number) > 0 ? kg(getValue() as number) : <span className="text-muted-foreground">—</span>), meta: { label: "Available (kg)", align: "right", csv: (c) => c.available_kg } as ColMeta<CollectionEvent> },
    ],
    [],
  );
  const hCols = useMemo<ColumnDef<Harvest, unknown>[]>(
    () => [
      { id: "date", accessorFn: (h) => h.harvest_date || "", header: ({ column }) => <SortHeader column={column}>Harvest date</SortHeader>, cell: ({ row: { original: h } }) => (h.harvest_date ? date(h.harvest_date) : <Badge tone="amber">No date</Badge>), meta: { label: "Harvest date", csv: (h) => h.harvest_date } as ColMeta<Harvest> },
      { id: "farm", accessorFn: (h) => h.farm_name || "", header: ({ column }) => <SortHeader column={column}>Farm</SortHeader>, cell: ({ row: { original: h } }) => farmLink(h.farm_id, h.farm_name), meta: { label: "Farm", csv: (h) => h.farm_name } as ColMeta<Harvest> },
      { id: "farmer", accessorFn: (h) => h.farmer_name || "", header: ({ column }) => <SortHeader column={column}>Farmer</SortHeader>, cell: ({ getValue }) => (getValue() as string) || "—", meta: { label: "Farmer", csv: (h) => h.farmer_name } as ColMeta<Harvest> },
      { id: "qty", accessorKey: "quantity_kg", header: ({ column }) => <SortHeader column={column} align="right">Quantity</SortHeader>, cell: ({ getValue }) => kg(getValue() as number), meta: { label: "Quantity (kg)", align: "right", csv: (h) => h.quantity_kg } as ColMeta<Harvest> },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Harvests & collections"
        subtitle="Harvests are what farmers report; collections are what your agents weigh. The two are checked against each other."
        actions={
          <>
            <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setAddH(true)}>
              Record harvest
            </Button>
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAddC(true)}>
              Record collection
            </Button>
          </>
        }
      />
      {unbatched > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3 text-sm shadow-card">
          <span>
            <b className="tabular-nums">{kg(unbatched)}</b> collected but not yet in a batch.
          </span>
          <Link href="/batches?new=1" className="font-medium text-primary hover:underline">
            Create batch →
          </Link>
        </div>
      )}
      <Card>
        <Tabs defaultValue="collections">
          <div className="px-4 pt-4">
            <TabsList>
              <TabsTrigger value="collections">Collections {collections.data?.length ?? ""}</TabsTrigger>
              <TabsTrigger value="harvests">Harvests {harvests.data?.length ?? ""}</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="collections" className="mt-0">
            {collections.loading ? (
              <Loading />
            ) : (
              <DataTable
                data={collections.data || []}
                columns={cCols}
                csvName="collections"
                searchPlaceholder="Search farm, farmer, agent…"
                initialSort={[{ id: "when", desc: true }]}
                emptyState={<Empty icon={<Scale />} title="No collections yet" body="Record each time an agent weighs and buys cocoa from a farm." action={<Button onClick={() => setAddC(true)}>Record collection</Button>} />}
              />
            )}
          </TabsContent>
          <TabsContent value="harvests" className="mt-0">
            {harvests.loading ? (
              <Loading />
            ) : (
              <DataTable
                data={harvests.data || []}
                columns={hCols}
                csvName="harvests"
                searchPlaceholder="Search farm or farmer…"
                emptyState={<Empty icon={<Scale />} title="No harvests yet" action={<Button onClick={() => setAddH(true)}>Record harvest</Button>} />}
              />
            )}
          </TabsContent>
        </Tabs>
      </Card>
      {addH && <HarvestForm open onClose={() => setAddH(false)} onSaved={() => undefined} />}
      {addC && <CollectionForm open onClose={() => setAddC(false)} onSaved={() => undefined} />}
    </>
  );
}
