"use client";

import { Download, FileText } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { type ColMeta, type ColumnDef, DataTable, SortHeader } from "@/components/DataTable";
import { Badge, Button, Card, Empty, Loading, PageHeader } from "@/components/kit";
import { downloadFile } from "@/lib/api";
import { DOCUMENT_LABELS, date, shortId } from "@/lib/format";
import type { DocumentItem } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const LINK_HREF = { farmer: "/farmers/", shipment: "/shipments/", batch: "/batches#" } as const;

export default function DocumentsPage() {
  const docs = useApi<DocumentItem[]>("/api/v1/documents");
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const expiring = (docs.data || []).filter((d) => d.expiry_date && d.expiry_date >= today && d.expiry_date <= in30).length;

  const columns = useMemo<ColumnDef<DocumentItem, unknown>[]>(
    () => [
      { id: "type", accessorFn: (d) => DOCUMENT_LABELS[d.document_type], header: ({ column }) => <SortHeader column={column}>Type</SortHeader>, cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span>, meta: { label: "Type", csv: (d) => DOCUMENT_LABELS[d.document_type] } as ColMeta<DocumentItem>, enableHiding: false },
      { id: "file", accessorFn: (d) => d.original_filename || "", header: "File", cell: ({ getValue }) => <span className="block max-w-[16rem] truncate">{(getValue() as string) || "External file"}</span>, meta: { label: "File", csv: (d) => d.original_filename } as ColMeta<DocumentItem> },
      {
        id: "link",
        accessorFn: (d) => d.linked_to_type,
        header: "Belongs to",
        cell: ({ row: { original: d } }) => (
          <Link href={`${LINK_HREF[d.linked_to_type]}${d.linked_to_id}`} className="capitalize text-primary hover:underline">
            {d.linked_to_type} {shortId(d.linked_to_id)}
          </Link>
        ),
        meta: { label: "Belongs to", csv: (d) => `${d.linked_to_type}:${d.linked_to_id}` } as ColMeta<DocumentItem>,
      },
      { id: "uploaded", accessorFn: (d) => d.uploaded_at || "", header: ({ column }) => <SortHeader column={column}>Uploaded</SortHeader>, cell: ({ row: { original: d } }) => date(d.uploaded_at), meta: { label: "Uploaded", csv: (d) => d.uploaded_at } as ColMeta<DocumentItem> },
      {
        id: "expires",
        accessorFn: (d) => d.expiry_date || "9999",
        header: ({ column }) => <SortHeader column={column}>Expires</SortHeader>,
        cell: ({ row: { original: d } }) =>
          !d.expiry_date ? "—" : d.expiry_date < today ? <Badge tone="red">Expired {date(d.expiry_date)}</Badge> : d.expiry_date <= in30 ? <Badge tone="amber">{date(d.expiry_date)}</Badge> : date(d.expiry_date),
        meta: { label: "Expires", csv: (d) => d.expiry_date } as ColMeta<DocumentItem>,
      },
      {
        id: "dl",
        header: "",
        cell: ({ row: { original: d } }) =>
          d.has_file && (
            <Button size="sm" variant="ghost" icon={<Download className="h-4 w-4" />} onClick={() => downloadFile(`/api/v1/documents/${d.id}/file`, d.original_filename || "document")}>
              Download
            </Button>
          ),
        enableHiding: false,
      },
    ],
    [today, in30],
  );

  return (
    <>
      <PageHeader title="Documents" subtitle="Certificates, IDs, land titles and receipts. Upload them from a farmer, batch or shipment page." />
      {expiring > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {expiring} document{expiring === 1 ? " expires" : "s expire"} in the next 30 days.
        </div>
      )}
      <Card>
        {docs.loading ? (
          <Loading />
        ) : (
          <DataTable
            data={docs.data || []}
            columns={columns}
            csvName="documents"
            searchPlaceholder="Search documents…"
            initialSort={[{ id: "uploaded", desc: true }]}
            emptyState={<Empty icon={<FileText />} title="No documents" body="Open a farmer or shipment to upload its documents." />}
          />
        )}
      </Card>
    </>
  );
}
