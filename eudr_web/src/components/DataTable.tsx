"use client";

import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Columns3, Download, Search } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

export type { ColumnDef } from "@tanstack/react-table";

/** Column meta: `csv` returns the plain value for CSV export; `label` names
 * the column in the visibility menu and CSV header; `align` right-aligns numbers. */
export interface ColMeta<T> {
  label?: string;
  csv?: (row: T) => string | number | null | undefined;
  align?: "right";
  className?: string;
}

function toCsv<T>(rows: T[], cols: ColumnDef<T, unknown>[]) {
  const usable = cols.filter((c) => (c.meta as ColMeta<T> | undefined)?.csv);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = usable.map((c) => esc((c.meta as ColMeta<T>).label ?? c.id));
  const body = rows.map((r) => usable.map((c) => esc((c.meta as ColMeta<T>).csv!(r))).join(","));
  return [head.join(","), ...body].join("\n");
}

export function SortHeader({ column, children, align }: { column: { getIsSorted: () => false | "asc" | "desc"; toggleSorting: (desc?: boolean) => void }; children: React.ReactNode; align?: "right" }) {
  const s = column.getIsSorted();
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(s === "asc")}
      className={cn("-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 uppercase hover:text-foreground", align === "right" && "flex-row-reverse")}
    >
      {children}
      {s === "asc" ? <ArrowUp className="h-3 w-3" /> : s === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
    </button>
  );
}

export function DataTable<T>({
  data,
  columns,
  searchPlaceholder = "Search…",
  toolbar,
  onRowClick,
  csvName,
  pageSize = 20,
  emptyState,
  initialSort,
  rowId,
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  onRowClick?: (row: T) => void;
  csvName?: string;
  pageSize?: number;
  emptyState?: React.ReactNode;
  initialSort?: SortingState;
  rowId?: (row: T) => string;
}) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSort ?? []);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [visibility, setVisibility] = React.useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnVisibility: visibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setVisibility,
    getRowId: rowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    globalFilterFn: (row, _id, value) => {
      const needle = String(value).toLowerCase();
      return Object.values(row.original as Record<string, unknown>).some((v) => v != null && typeof v !== "object" && String(v).toLowerCase().includes(needle));
    },
  });

  const filtered = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize: size } = table.getState().pagination;

  const exportCsv = () => {
    const rows = table.getSortedRowModel().rows.map((r) => r.original);
    const blob = new Blob([toCsv(rows, columns)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${csvName}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} placeholder={searchPlaceholder} className="pl-8" />
        </div>
        {toolbar}
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Show columns</DropdownMenuLabel>
              {table
                .getAllLeafColumns()
                .filter((c) => c.getCanHide() && (c.columnDef.meta as ColMeta<T> | undefined)?.label)
                .map((c) => (
                  <DropdownMenuCheckboxItem key={c.id} checked={c.getIsVisible()} onCheckedChange={(v) => c.toggleVisibility(!!v)} onSelect={(e) => e.preventDefault()}>
                    {(c.columnDef.meta as ColMeta<T>).label}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {csvName && (
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered}>
              <Download /> Export CSV
            </Button>
          )}
        </div>
      </div>

      {filtered === 0 ? (
        emptyState ?? <p className="px-5 py-10 text-center text-sm text-muted-foreground">{globalFilter ? "Nothing matches that search." : "Nothing here yet."}</p>
      ) : (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((h) => {
                  const meta = h.column.columnDef.meta as ColMeta<T> | undefined;
                  return (
                    <TableHead key={h.id} className={cn(meta?.align === "right" && "text-right", meta?.className)}>
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                id={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={cn(onRowClick && "cursor-pointer")}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as ColMeta<T> | undefined;
                  return (
                    <TableCell key={cell.id} className={cn(meta?.align === "right" && "text-right tabular-nums", meta?.className)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {filtered > size && (
        <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
          <span>
            {pageIndex * size + 1}–{Math.min((pageIndex + 1) * size, filtered)} of {filtered}
          </span>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft /> Prev
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Next <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
