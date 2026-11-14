import { CheckCircle2, MapPinned, ShieldCheck, Trees } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const POINTS = [
  { icon: MapPinned, title: "Every plot on the map", body: "GPS boundaries for each farm, checked for overlaps and impossible sizes." },
  { icon: Trees, title: "Deforestation screening", body: "Plots screened against forest-loss data since the 2020 cut-off." },
  { icon: ShieldCheck, title: "Ready before you ship", body: "One readiness score per shipment, with the evidence pack buyers ask for." },
];

function ReadinessPreview() {
  const checks = ["Geolocation for all 214 plots", "No forest loss after 2020", "Volumes reconcile farm → batch", "Documents complete"];
  return (
    <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-200/70">Example shipment</p>
          <p className="mt-0.5 font-display text-base font-semibold text-white">SHP-0417 · 24 t cocoa → Rotterdam</p>
        </div>
        <div className="relative h-14 w-14">
          <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="3.5" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#5eea9a" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="97.4" strokeDashoffset="7.8" className="animate-draw" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold text-white">92</span>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {checks.map((c, i) => (
          <li key={c} className="flex items-center gap-2 text-sm text-white/80 animate-fade-up" style={{ animationDelay: `${150 + i * 120}ms`, animationFillMode: "both" }}>
            <CheckCircle2 className="h-4 w-4 flex-none text-emerald-300" /> {c}
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-lg bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100/80">Illustration only. Your own shipments appear after you sign in.</p>
    </div>
  );
}

export default function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[#06261b] p-10 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0 opacity-90 [background:radial-gradient(60rem_40rem_at_-10%_-10%,rgba(31,191,106,.35),transparent_60%),radial-gradient(40rem_30rem_at_110%_110%,rgba(199,245,166,.18),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <Link href="/" className="relative">
          <Logo size={34} tone="light" />
        </Link>
        <div className="relative my-auto space-y-10 py-10">
          <div className="max-w-md">
            <h2 className="font-display text-[2.2rem] font-bold leading-[1.1] tracking-tight">
              Every bag traced to the farm.{" "}
              <span className="bg-gradient-to-r from-emerald-300 to-lime-200 bg-clip-text text-transparent">
                Every shipment <span className="whitespace-nowrap">EU-ready.</span>
              </span>
            </h2>
            <div className="mt-8 space-y-5">
              {POINTS.map(({ icon: Icon, title: t, body }) => (
                <div key={t} className="flex gap-3.5">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                    <Icon className="h-[18px] w-[18px] text-emerald-300" />
                  </span>
                  <div>
                    <p className="font-semibold">{t}</p>
                    <p className="text-sm text-white/60">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="animate-float">
            <ReadinessPreview />
          </div>
        </div>
        <p className="relative text-xs text-white/45">Built in Nigeria for cocoa, rubber and palm oil exporters.</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[400px] animate-fade-up">
          <Link href="/" className="mb-10 inline-block lg:hidden">
            <Logo size={32} />
          </Link>
          <h1 className="font-display text-[1.75rem] font-bold tracking-tight text-foreground">{title}</h1>
          <div className="mt-1.5 text-sm text-muted-foreground">{subtitle}</div>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
