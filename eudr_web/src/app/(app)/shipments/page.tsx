"use client";

import { Plus, Ship } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { type ColMeta, type ColumnDef, DataTable, SortHeader } from "@/components/DataTable";
import { Button, Card, Empty, Loading, PageHeader, StatusBadge } from "@/components/kit";
import ShipmentForm from "@/components/ShipmentForm";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { date, kg } from "@/lib/format";
import type { Shipment } from "@/lib/types";
import { useApi } from "@/lib/useApi";

type F = "all" | "ready" | "blocked" | "unchecked";

function ShipmentsInner() {
  const shipments = useApi<Shipment[]>("/api/v1/shipments");
  const params = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<F>("all");
  const router = useRouter();
  useEffect(() => {
    if (params.get("new")) setCreating(true);
  }, [params]);
  const all = shipments.data || [];
  const is = {
    ready: (s: Shipment) => s.latest_score != null && !s.is_blocked && s.latest_score >= 90,
    blocked: (s: Shipment) => !!s.is_blocked,
    unchecked: (s: Shipment) => s.latest_score == null,
  };
  const list = filter === "all" ? all : all.filter(is[filter]);

  const columns = useMemo<ColumnDef<Shipment, unknown>[]>(
    () => [
      {
        id: "ref",
        accessorFn: (s) => s.reference || s.id,
        header: ({ column }) => <SortHeader column={column}>Shipment</SortHeader>,
        cell: ({ row: { original: s } }) => (
          <div>
            <Link href={`/shipments/${s.id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:text-primary">
              {s.reference || s.id.slice(0, 8)}
            </Link>
            <div className="text-xs text-muted-foreground">HS {s.hs_code}</div>
          </div>
        ),
        meta: { label: "Shipment", csv: (s) => s.reference } as ColMeta<Shipment>,
        enableHiding: false,
      },
      { id: "buyer", accessorFn: (s) => s.buyer_name || "", header: ({ column }) => <SortHeader column={column}>Buyer</SortHeader>, cell: ({ getValue }) => (getValue() as string) || "—", meta: { label: "Buyer", csv: (s) => s.buyer_name } as ColMeta<Shipment> },
      { id: "dest", accessorFn: (s) => s.destination_country || "", header: "Destination", cell: ({ getValue }) => (getValue() as string) || "—", meta: { label: "Destination", csv: (s) => s.destination_country } as ColMeta<Shipment> },
      { id: "batches", accessorKey: "batch_count", header: "Batches", meta: { label: "Batches", csv: (s) => s.batch_count } as ColMeta<Shipment> },
      {
        id: "mass",
        accessorKey: "net_mass_kg",
        header: ({ column }) => <SortHeader column={column} align="right">Net mass</SortHeader>,
        cell: ({ getValue }) => kg(getValue() as number),
        meta: { label: "Net mass (kg)", align: "right", csv: (s) => s.net_mass_kg } as ColMeta<Shipment>,
      },
      {
        id: "score",
        accessorFn: (s) => s.latest_score ?? -1,
        header: ({ column }) => <SortHeader column={column} align="right">Score</SortHeader>,
        cell: ({ row: { original: s } }) => <span className="font-semibold">{s.latest_score ?? "—"}</span>,
        meta: { label: "Score", align: "right", csv: (s) => s.latest_score } as ColMeta<Shipment>,
      },
      {
        id: "status",
        accessorFn: (s) => (s.latest_score == null ? 1 : s.is_blocked ? 0 : 2),
        header: ({ column }) => <SortHeader column={column}>Status</SortHeader>,
        cell: ({ row: { original: s } }) => <StatusBadge score={s.latest_score} blocked={s.is_blocked} />,
        meta: { label: "Status", csv: (s) => (s.latest_score == null ? "not assessed" : s.is_blocked ? "blocked" : "ok") } as ColMeta<Shipment>,
      },
      { id: "checked", accessorFn: (s) => s.last_assessed_at || "", header: ({ column }) => <SortHeader column={column}>Last checked</SortHeader>, cell: ({ row: { original: s } }) => date(s.last_assessed_at), meta: { label: "Last checked", csv: (s) => s.last_assessed_at } as ColMeta<Shipment> },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Shipments"
        subtitle="Each shipment gets a readiness score from 21 checks, including deforestation"
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
            New shipment
          </Button>
        }
      />
      <Card>
        {shipments.loading ? (
          <Loading />
        ) : (
          <>
            <div className="px-4 pt-4">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as F)}>
                <TabsList>
                  <TabsTrigger value="all">All {all.length}</TabsTrigger>
                  <TabsTrigger value="ready">Ready {all.filter(is.ready).length}</TabsTrigger>
                  <TabsTrigger value="blocked">Blocked {all.filter(is.blocked).length}</TabsTrigger>
                  <TabsTrigger value="unchecked">Not checked {all.filter(is.unchecked).length}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <DataTable
              data={list}
              columns={columns}
              onRowClick={(s) => router.push(`/shipments/${s.id}`)}
              searchPlaceholder="Search reference, buyer, country…"
              csvName="shipments"
              emptyState={<Empty icon={<Ship />} title="No shipments here" body="Create a shipment from your batches to check if it's ready for the EU." action={<Button onClick={() => setCreating(true)}>New shipment</Button>} />}
            />
          </>
        )}
      </Card>
      {creating && (
        <ShipmentForm
          open
          onClose={() => {
            setCreating(false);
            if (params.get("new")) router.replace("/shipments");
          }}
          onSaved={(s) => router.push(`/shipments/${s.id}`)}
        />
      )}
    </>
  );
}

export default function ShipmentsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ShipmentsInner />
    </Suspense>
  );
}
