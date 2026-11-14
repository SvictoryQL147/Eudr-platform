"use client";

import { Boxes, FileText, KeyRound, LogIn, Map, Pencil, Plus, Scale, ShieldCheck, Ship, Trash2, Trees, UserPlus, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, Empty, ErrorBox, Loading } from "@/components/kit";
import { api } from "@/lib/api";
import { entityLink } from "@/lib/format";
import type { AuditEvent } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { cn } from "@/lib/utils";

const ENTITY_ICON: Record<string, typeof Plus> = {
  farmer: UsersRound,
  farm: Map,
  harvest: Scale,
  collection: Scale,
  batch: Boxes,
  shipment: Ship,
  document: FileText,
  screening: Trees,
  user: UserRound,
  organization: ShieldCheck,
};

function iconFor(e: AuditEvent) {
  if (e.action === "auth.login") return { Icon: LogIn, tone: "bg-sky-50 text-sky-700 ring-sky-100" };
  if (e.action.startsWith("auth.")) return { Icon: KeyRound, tone: "bg-violet-50 text-violet-700 ring-violet-100" };
  if (e.action.startsWith("user.invite")) return { Icon: UserPlus, tone: "bg-violet-50 text-violet-700 ring-violet-100" };
  if (e.action.endsWith(".delete") || e.action === "user.deactivate") return { Icon: Trash2, tone: "bg-red-50 text-red-700 ring-red-100" };
  if (e.action === "assessment.run") return { Icon: ShieldCheck, tone: "bg-emerald-50 text-emerald-700 ring-emerald-100" };
  if (e.action.endsWith(".update")) return { Icon: Pencil, tone: "bg-amber-50 text-amber-700 ring-amber-100" };
  return { Icon: ENTITY_ICON[e.entity_type || ""] || Plus, tone: "bg-emerald-50 text-emerald-700 ring-emerald-100" };
}

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function fmt(v: unknown) {
  if (v === null || v === undefined || v === "") return "empty";
  return String(v);
}

export function EventRow({ e, last, showLink = true }: { e: AuditEvent; last?: boolean; showLink?: boolean }) {
  const { Icon, tone } = iconFor(e);
  const href = showLink && e.entity_type && e.entity_id && !e.action.endsWith(".delete") ? entityLink(e.entity_type, e.entity_id) : null;
  return (
    <li className="relative flex gap-3 pb-5">
      {!last && <span className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-border" />}
      <span className={cn("relative flex h-8 w-8 flex-none items-center justify-center rounded-full ring-4", tone)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-sm">
          <span className="font-medium text-foreground">{e.user_name || "System"}</span>{" "}
          <span className="text-muted-foreground">{e.summary.charAt(0).toLowerCase() + e.summary.slice(1)}</span>
          {href && (
            <>
              {" · "}
              <Link href={href} className="font-medium text-primary hover:underline">
                Open
              </Link>
            </>
          )}
        </p>
        {e.changes && Object.keys(e.changes).length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {Object.entries(e.changes)
              .slice(0, 4)
              .map(([k, c]) => (
                <span key={k} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  {k.replace(/_/g, " ")}: <s className="opacity-70">{fmt(c.from)}</s> → <span className="text-foreground">{fmt(c.to)}</span>
                </span>
              ))}
          </div>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground" title={new Date(e.created_at).toLocaleString()}>
          {timeAgo(e.created_at)}
        </p>
      </div>
    </li>
  );
}

/** Paged activity feed. `query` is appended to /api/v1/audit. */
export function ActivityFeed({ query = "", showLink = true, emptyText = "Nothing has happened here yet." }: { query?: string; showLink?: boolean; emptyText?: string }) {
  const first = useApi<AuditEvent[]>(`/api/v1/audit?limit=30${query}`);
  const [more, setMore] = useState<AuditEvent[]>([]);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  if (first.loading && !first.data) return <Loading rows={4} />;
  if (first.error) return <ErrorBox message={first.error} />;
  const rows = [...(first.data || []), ...more];
  if (!rows.length) return <Empty title="No activity yet" body={emptyText} />;
  const canMore = !done && (first.data?.length || 0) >= 30;
  return (
    <div>
      <ol>
        {rows.map((e, i) => (
          <EventRow key={e.id} e={e} last={i === rows.length - 1} showLink={showLink} />
        ))}
      </ol>
      {canMore && (
        <Button
          variant="secondary"
          size="sm"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const page = await api<AuditEvent[]>(`/api/v1/audit?limit=30${query}&before=${encodeURIComponent(rows[rows.length - 1].created_at)}`);
              setMore((m) => [...m, ...page]);
              if (page.length < 30) setDone(true);
            } finally {
              setBusy(false);
            }
          }}
        >
          Load older
        </Button>
      )}
    </div>
  );
}

/** "History" card body for a single record. */
export function RecordHistory({ entityId }: { entityId: string }) {
  return <ActivityFeed query={`&entity_id=${encodeURIComponent(entityId)}`} showLink={false} emptyText="Changes to this record will show here." />;
}
