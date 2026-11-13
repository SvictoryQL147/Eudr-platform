import { CheckCircle2, FileJson, MapPin, ShieldCheck, TriangleAlert } from "lucide-react";

const PLOTS = [
  { d: "M70 70 L150 58 L168 128 L86 142 Z", c: "#34d399" },
  { d: "M182 52 L262 66 L250 132 L176 120 Z", c: "#34d399" },
  { d: "M98 160 L178 146 L196 214 L104 228 Z", c: "#fbbf24" },
  { d: "M206 146 L292 150 L286 222 L210 226 Z", c: "#34d399" },
  { d: "M282 70 L352 84 L340 140 L270 132 Z", c: "#34d399" },
  { d: "M304 160 L368 152 L380 214 L314 226 Z", c: "#34d399" },
];

/** Product illustration for the hero — sample data, drawn in SVG/CSS. */
export default function ProductMock() {
  return (
    <div className="relative mx-auto w-full max-w-[640px]">
      <div className="absolute -inset-8 rounded-[2.5rem] bg-emerald-400/20 blur-3xl" aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#0b1f17]/90 shadow-[0_40px_120px_-20px_rgba(0,0,0,.6)] backdrop-blur">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="ml-3 truncate text-xs text-white/50">Shipment LOS-RTM-0412 · Rotterdam · HS 1801</span>
          <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/50">Sample</span>
        </div>
        <div className="grid gap-0 sm:grid-cols-[1.35fr_1fr]">
          <div className="relative aspect-[4/3] overflow-hidden border-b border-white/10 sm:aspect-auto sm:min-h-[300px] sm:border-b-0 sm:border-r">
            <svg viewBox="0 0 420 300" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
              <defs>
                <radialGradient id="g1" cx="30%" cy="30%" r="60%">
                  <stop offset="0" stopColor="#2f5d3a" />
                  <stop offset="1" stopColor="#13291c" />
                </radialGradient>
                <radialGradient id="g2" cx="70%" cy="70%" r="50%">
                  <stop offset="0" stopColor="#4a6b2f" stopOpacity=".55" />
                  <stop offset="1" stopColor="#4a6b2f" stopOpacity="0" />
                </radialGradient>
                <pattern id="canopy" width="14" height="14" patternUnits="userSpaceOnUse">
                  <circle cx="4" cy="5" r="3.2" fill="#1d3b26" opacity=".7" />
                  <circle cx="11" cy="11" r="2.6" fill="#26492e" opacity=".6" />
                </pattern>
              </defs>
              <rect width="420" height="300" fill="url(#g1)" />
              <rect width="420" height="300" fill="url(#canopy)" />
              <rect width="420" height="300" fill="url(#g2)" />
              <path d="M0 250 C 90 230, 150 270, 240 248 S 380 230, 420 246" stroke="#7a6a4a" strokeWidth="6" fill="none" opacity=".55" />
              <path d="M30 0 C 50 80, 20 160, 48 300" stroke="#6b5c40" strokeWidth="3" fill="none" opacity=".4" />
              {PLOTS.map((p, i) => (
                <path
                  key={i}
                  d={p.d}
                  fill={p.c}
                  fillOpacity=".22"
                  stroke={p.c}
                  strokeWidth="2"
                  strokeDasharray="600"
                  className="animate-draw"
                  style={{ animationDelay: `${0.25 * i}s`, strokeDashoffset: 600 }}
                />
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 animate-scan bg-gradient-to-b from-transparent via-emerald-300/20 to-transparent" />
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-black/45 px-2 py-1 text-[11px] text-white/85 backdrop-blur">
              <MapPin className="h-3 w-3 text-emerald-300" /> 6 plots · Idanre, Ondo
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5 text-[10px]">
              <span className="rounded bg-black/45 px-1.5 py-0.5 text-emerald-200 backdrop-blur">● Low risk 5</span>
              <span className="rounded bg-black/45 px-1.5 py-0.5 text-amber-200 backdrop-blur">● Needs evidence 1</span>
            </div>
          </div>
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 flex-none">
                <svg viewBox="0 0 80 80" className="-rotate-90">
                  <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,.1)" strokeWidth="7" fill="none" />
                  <circle cx="40" cy="40" r="34" stroke="#34d399" strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray="213.6" strokeDashoffset="17" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-semibold text-white">92</span>
                  <span className="text-[9px] uppercase tracking-wider text-white/40">score</span>
                </div>
              </div>
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-300" /> Not blocked
                </span>
                <p className="mt-1.5 text-xs leading-snug text-white/55">21 checks run on every farm, batch and document</p>
              </div>
            </div>
            <ul className="space-y-2 text-xs">
              {[
                [true, "Every plot mapped (GeoJSON, 6 dp)"],
                [true, "Batch weights reconcile to farms"],
                [true, "Export certificate on file"],
                [false, "1 plot needs pre-2021 evidence"],
              ].map(([ok, t]) => (
                <li key={t as string} className="flex items-start gap-2 text-white/75">
                  {ok ? <CheckCircle2 className="mt-px h-3.5 w-3.5 flex-none text-emerald-300" /> : <TriangleAlert className="mt-px h-3.5 w-3.5 flex-none text-amber-300" />}
                  {t}
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
              <span className="flex items-center gap-1.5">
                <FileJson className="h-3.5 w-3.5 text-emerald-300" /> Evidence pack
              </span>
              <span className="text-emerald-300">Ready to send</span>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -right-3 -top-7 hidden animate-float items-center gap-2.5 rounded-xl border border-white/15 bg-[#0b1f17]/95 px-3.5 py-2.5 shadow-2xl backdrop-blur sm:flex">
        <ShieldCheck className="h-5 w-5 text-emerald-300" />
        <div className="leading-tight">
          <p className="text-xs font-medium text-white">Deforestation screen</p>
          <p className="text-[11px] text-white/55">Tree cover 2020 · clearing after 2020</p>
        </div>
      </div>
    </div>
  );
}
