"use client";

import { History } from "lucide-react";
import { useState } from "react";
import { ActivityFeed } from "@/components/Activity";
import { Card, PageHeader } from "@/components/kit";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "", label: "Everything" },
  { key: "shipment", label: "Shipments" },
  { key: "assessment", label: "Readiness checks" },
  { key: "farm", label: "Farms & farmers" },
  { key: "batch", label: "Batches" },
  { key: "document", label: "Documents" },
  { key: "screening", label: "Screening" },
  { key: "user", label: "Team" },
  { key: "auth", label: "Sign-ins" },
];

export default function ActivityPage() {
  const { can } = useAuth();
  const [filter, setFilter] = useState("");
  const full = can("audit.view");
  return (
    <>
      <PageHeader
        title="Activity"
        subtitle={
          full
            ? "A permanent record of who changed what, and when. Entries can't be edited or deleted, so it holds up when a buyer or auditor asks."
            : "Your own recent actions. Admins and compliance reviewers see the whole organization."
        }
      />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition",
              filter === f.key ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <History className="h-4 w-4" /> Newest first
        </div>
        <ActivityFeed key={filter} query={filter === "farm" ? "&action=farm" : filter ? `&action=${filter}` : ""} />
      </Card>
    </>
  );
}
