"use client";

import { CheckCircle2, CircleHelp, Radar, ShieldAlert, ShieldCheck, ShieldQuestion, Trees } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { date } from "@/lib/format";
import type { Risk, ScreeningJob, ScreeningStatus } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { Badge, Button, Modal } from "./kit";
import { Progress } from "./ui/progress";
import { Tip } from "./ui/tooltip";

export const RISK_LABEL: Record<Risk, string> = {
  low: "Low risk",
  more_info_needed: "Needs evidence",
  high: "High risk",
};

export function RiskBadge({ risk, outdated, demo }: { risk: Risk | null | undefined; outdated?: boolean; demo?: boolean }) {
  const demoTag = demo ? <span className="ml-0.5 rounded bg-violet-100 px-1 text-[10px] font-semibold text-violet-700">DEMO</span> : null;
  if (!risk)
    return outdated ? (
      <Tip content="The boundary changed after the last screening. Screen it again.">
        <span>
          <Badge tone="amber">
            <ShieldQuestion /> Re-screen
          </Badge>
        </span>
      </Tip>
    ) : (
      <Badge>
        <ShieldQuestion /> Not screened
      </Badge>
    );
  if (risk === "low")
    return (
      <Badge tone="green">
        <ShieldCheck /> {RISK_LABEL.low}
        {demoTag}
      </Badge>
    );
  if (risk === "high")
    return (
      <Badge tone="red">
        <ShieldAlert /> {RISK_LABEL.high}
        {demoTag}
      </Badge>
    );
  return (
    <Badge tone="amber">
      <CircleHelp /> {RISK_LABEL.more_info_needed}
      {demoTag}
    </Badge>
  );
}

const QUESTIONS: { key: string; q: string; good: "yes" | "no" | null }[] = [
  { key: "treecover_2020", q: "Tree cover at end of 2020?", good: null },
  { key: "commodities_2020", q: "Farmland / commodity crop in 2020?", good: null },
  { key: "disturbance_before_2020", q: "Clearing before 2021?", good: null },
  { key: "disturbance_after_2020", q: "Clearing after 2020?", good: "no" },
];

export function IndicatorList({ indicators }: { indicators: Record<string, string | null> | null | undefined }) {
  if (!indicators) return null;
  return (
    <ul className="divide-y rounded-lg border text-sm">
      {QUESTIONS.map(({ key, q, good }) => {
        const v = indicators[key];
        const bad = good && v && v !== good;
        return (
          <li key={key} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-muted-foreground">{q}</span>
            <span className={bad ? "font-semibold text-red-700" : "font-medium"}>{v ? v[0].toUpperCase() + v.slice(1) : "—"}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Starts a screening job and follows it until it finishes. */
export function ScreenButton({
  shipmentId,
  farmIds,
  label = "Screen for deforestation",
  onlyUnscreened = true,
  size = "md",
  variant = "secondary",
}: {
  shipmentId?: string;
  farmIds?: string[];
  label?: string;
  onlyUnscreened?: boolean;
  size?: "sm" | "md";
  variant?: "primary" | "secondary";
}) {
  const status = useApi<ScreeningStatus>("/api/v1/screening/status");
  const [jobId, setJobId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const job = useApi<ScreeningJob>(jobId ? `/api/v1/screening/jobs/${jobId}` : null, { refetchInterval: jobId ? 2000 : false });
  const j = job.data;

  useEffect(() => {
    if (!j || !jobId) return;
    if (j.status === "done") {
      setJobId(null);
      toast.success(j.farm_count ? `Screened ${j.done_count} of ${j.farm_count} plot${j.farm_count === 1 ? "" : "s"}` : "Every plot was already screened", {
        description: j.error || (j.provider === "demo" ? "DEMO results — not a real satellite analysis." : "Re-check readiness to update the score."),
      });
      import("@/lib/query").then(({ queryClient }) => queryClient.invalidateQueries());
    } else if (j.status === "failed") {
      setJobId(null);
      toast.error("Screening failed", { description: j.error || undefined });
    }
  }, [j, jobId]);

  const start = async () => {
    if (status.data && !status.data.enabled) return setSetupOpen(true);
    setStarting(true);
    try {
      const created = await api<ScreeningJob>("/api/v1/screening/jobs", {
        body: { shipment_id: shipmentId ?? null, farm_ids: farmIds ?? [], only_unscreened: onlyUnscreened },
      });
      if (created.farm_count === 0) toast.info("Nothing to screen", { description: "Every mapped plot already has a result for its current boundary." });
      else {
        setJobId(created.id);
        toast.message(`Screening ${created.farm_count} plot${created.farm_count === 1 ? "" : "s"}…`, {
          description: created.provider === "whisp" ? "Whisp checks each plot against many satellite datasets. This can take a few minutes." : "Demo mode",
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't start screening");
    } finally {
      setStarting(false);
    }
  };

  const running = !!jobId;
  const pct = j && j.farm_count ? Math.round((100 * j.done_count) / j.farm_count) : 5;

  return (
    <>
      <div className="inline-flex flex-col gap-1.5">
        <Button variant={variant} size={size} icon={<Radar className="h-4 w-4" />} loading={starting || running} onClick={start}>
          {running ? `Screening… ${j?.done_count ?? 0}/${j?.farm_count ?? "?"}` : label}
        </Button>
        {running && <Progress value={pct} className="h-1" />}
      </div>
      <Modal open={setupOpen} onClose={() => setSetupOpen(false)} title="Turn on deforestation screening">
        <div className="space-y-4 text-sm">
          <div className="flex gap-3 rounded-lg bg-accent p-3 text-accent-foreground">
            <Trees className="mt-0.5 h-5 w-5 flex-none" />
            <p>
              Screening uses <b>Whisp</b>, the free, open-source EUDR tool from FAO and the Forest Data Partnership. It checks each plot
              against many satellite maps to see whether there was forest at the end of 2020 and clearing since.
            </p>
          </div>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Sign in at <b>whisp.openforis.org</b> and create an API key on your account page.
            </li>
            <li>
              In <code className="rounded bg-secondary px-1">eudr_core/.env</code> add:
              <pre className="mt-1.5 overflow-x-auto rounded-md bg-secondary p-2 text-xs">{`EUDR_SCREENING_PROVIDER=whisp
EUDR_WHISP_API_KEY=your-key-here`}</pre>
            </li>
            <li>Restart the backend and press the button again.</li>
          </ol>
          <p className="text-muted-foreground">
            For a demo without a key, set <code className="rounded bg-secondary px-1">EUDR_SCREENING_PROVIDER=demo</code>. Demo results are labelled DEMO
            everywhere and must not be sent to buyers.
          </p>
          <div className="flex justify-end">
            <Button onClick={() => setSetupOpen(false)} icon={<CheckCircle2 className="h-4 w-4" />}>
              Got it
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function ScreenedLine({ at, provider }: { at: string | null; provider: string | null }) {
  if (!at) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Screened {date(at)} with {provider === "demo" ? "DEMO provider" : "Whisp (FAO / Forest Data Partnership)"}
    </p>
  );
}
