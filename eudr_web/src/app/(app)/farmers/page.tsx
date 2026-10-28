"use client";

import { Plus, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { type ColMeta, type ColumnDef, DataTable, SortHeader } from "@/components/DataTable";
import FarmerForm from "@/components/FarmerForm";
import { Badge, Button, Card, Empty, ErrorBox, Loading, PageHeader } from "@/components/kit";
import { ha } from "@/lib/format";
import type { Farmer } from "@/lib/types";
import { useApi } from "@/lib/useApi";

function FarmersInner() {
  const { data, error, loading } = useApi<Farmer[]>("/api/v1/farmers");
  const params = useSearchParams();
  const [adding, setAdding] = useState(false);
  const router = useRouter();
  useEffect(() => {
    if (params.get("new")) setAdding(true);
  }, [params]);

  const columns = useMemo<ColumnDef<Farmer, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "full_name",
        header: ({ column }) => <SortHeader column={column}>Name</SortHeader>,
        cell: ({ row }) => (
          <Link href={`/farmers/${row.original.id}`} className="font-medium hover:text-primary" onClick={(e) => e.stopPropagation()}>
            {row.original.full_name}
          </Link>
        ),
        meta: { label: "Name", csv: (r) => r.full_name } as ColMeta<Farmer>,
        enableHiding: false,
      },
      {
        id: "location",
        accessorFn: (r) => [r.community, r.state].filter(Boolean).join(", "),
        header: ({ column }) => <SortHeader column={column}>Location</SortHeader>,
        cell: ({ getValue }) => (getValue() as string) || <span className="text-muted-foreground">—</span>,
        meta: { label: "Location", csv: (r) => [r.community, r.state].filter(Boolean).join(", ") } as ColMeta<Farmer>,
      },
      {
        id: "phone",
        accessorKey: "phone_number",
        header: "Phone",
        cell: ({ getValue }) => (getValue() as string) || <span className="text-muted-foreground">—</span>,
        meta: { label: "Phone", csv: (r) => r.phone_number } as ColMeta<Farmer>,
      },
      {
        id: "id",
        accessorFn: (r) => (r.national_id_number ? 1 : 0),
        header: ({ column }) => <SortHeader column={column}>ID</SortHeader>,
        cell: ({ row }) => (row.original.national_id_number ? <Badge tone="green">On file</Badge> : <Badge tone="orange">Missing</Badge>),
        meta: { label: "ID document", csv: (r) => (r.national_id_number ? "yes" : "no") } as ColMeta<Farmer>,
      },
      {
        id: "farms",
        accessorFn: (r) => r.farm_count,
        header: ({ column }) => <SortHeader column={column}>Farms</SortHeader>,
        cell: ({ row: { original: f } }) =>
          f.farm_count === 0 ? <Badge tone="amber">No farm</Badge> : f.mapped_farm_count < f.farm_count ? <Badge tone="red">{f.mapped_farm_count}/{f.farm_count} mapped</Badge> : <Badge tone="green">{f.farm_count} mapped</Badge>,
        meta: { label: "Farms", csv: (r) => `${r.mapped_farm_count}/${r.farm_count}` } as ColMeta<Farmer>,
      },
      {
        id: "area",
        accessorKey: "total_hectares",
        header: ({ column }) => <SortHeader column={column} align="right">Area</SortHeader>,
        cell: ({ getValue }) => ha(getValue() as number),
        meta: { label: "Area (ha)", align: "right", csv: (r) => r.total_hectares } as ColMeta<Farmer>,
      },
    ],
    [],
  );

  const missingId = (data || []).filter((f) => !f.national_id_number).length;

  return (
    <>
      <PageHeader
        title="Farmers"
        subtitle="Everyone who supplies you, with their ID and farms"
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>
            Register farmer
          </Button>
        }
      />
      {error && <ErrorBox message={error} />}
      {missingId > 0 && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
          <b>{missingId} farmer{missingId === 1 ? " has" : "s have"} no ID number.</b> Each one adds a high-severity problem to any shipment with their cocoa.
        </div>
      )}
      <Card>
        {loading ? (
          <Loading />
        ) : (
          <DataTable
            data={data || []}
            columns={columns}
            searchPlaceholder="Search name, phone, community…"
            onRowClick={(f) => router.push(`/farmers/${f.id}`)}
            csvName="farmers"
            initialSort={[{ id: "name", desc: false }]}
            emptyState={
              <Empty
                icon={<UsersRound />}
                title="No farmers yet"
                body="Register the farmers who supply your cocoa. You'll add their farms next."
                action={<Button onClick={() => setAdding(true)}>Register farmer</Button>}
              />
            }
          />
        )}
      </Card>
      {adding && (
        <FarmerForm
          open
          onClose={() => {
            setAdding(false);
            if (params.get("new")) router.replace("/farmers");
          }}
          onSaved={(f) => router.push(`/farmers/${f.id}`)}
        />
      )}
    </>
  );
}

export default function FarmersPage() {
  return (
    <Suspense fallback={<Loading />}>
      <FarmersInner />
    </Suspense>
  );
}
