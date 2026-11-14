/* Illustrations for the landing page. All sample data, drawn in SVG/CSS. */
import { CheckCircle2, Fingerprint, MapPin, ShieldCheck, Ship, TriangleAlert } from "lucide-react";

const PLOT_PATHS = [
  "M60 70 L140 58 L158 128 L76 142 Z",
  "M172 52 L252 66 L240 132 L166 120 Z",
  "M88 160 L168 146 L186 214 L94 228 Z",
  "M196 146 L282 150 L276 222 L200 226 Z",
  "M272 70 L342 84 L330 140 L260 132 Z",
  "M294 160 L358 152 L370 214 L304 226 Z",
];

function Terrain({ id }: { id: string }) {
  return (
    <defs>
      <radialGradient id={`${id}-a`} cx="30%" cy="25%" r="75%">
        <stop offset="0" stopColor="#2c5a37" />
        <stop offset="1" stopColor="#0d2117" />
      </radialGradient>
      <pattern id={`${id}-c`} width="14" height="14" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="5" r="3.2" fill="#1d3b26" opacity=".75" />
        <circle cx="11" cy="11" r="2.6" fill="#28502f" opacity=".6" />
      </pattern>
    </defs>
  );
}

/** Hero journey: farms in Ondo → aggregation → Lagos port → EU. */
export function TraceJourney() {
  return (
    <svg viewBox="0 0 1200 260" className="h-auto w-full" aria-hidden>
      <defs>
        <linearGradient id="tj-line" x1="0" x2="1">
          <stop offset="0" stopColor="#34d399" stopOpacity=".2" />
          <stop offset=".5" stopColor="#a7f3d0" />
          <stop offset="1" stopColor="#bef264" stopOpacity=".6" />
        </linearGradient>
      </defs>
      <path d="M90 170 C 260 60, 380 220, 560 140 S 860 40, 1110 110" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="2" />
      <path d="M90 170 C 260 60, 380 220, 560 140 S 860 40, 1110 110" fill="none" stroke="url(#tj-line)" strokeWidth="2.5" strokeDasharray="6 14" className="animate-dash-flow" />
      {[
        { x: 90, y: 170, t: "Farm plots", s: "Idanre, Ondo", c: "#34d399" },
        { x: 330, y: 148, t: "Collection", s: "Weighed & logged", c: "#6ee7b7" },
        { x: 560, y: 140, t: "Batch LOT-118", s: "Inputs = output", c: "#a7f3d0" },
        { x: 820, y: 82, t: "Apapa, Lagos", s: "Score 100 · ready", c: "#d9f99d" },
        { x: 1110, y: 110, t: "Rotterdam", s: "Due diligence filed", c: "#bef264" },
      ].map((p, i) => (
        <g key={p.t}>
          <circle cx={p.x} cy={p.y} r="16" fill={p.c} opacity=".18" className="origin-center animate-ping-slow" style={{ transformBox: "fill-box", animationDelay: `${i * 400}ms` }} />
          <circle cx={p.x} cy={p.y} r="7" fill={p.c} stroke="#04130c" strokeWidth="3" />
          <text x={p.x} y={p.y + 38} textAnchor="middle" fill="white" fontSize="17" fontWeight="600" fontFamily="Plus Jakarta Sans, Inter, sans-serif">
            {p.t}
          </text>
          <text x={p.x} y={p.y + 60} textAnchor="middle" fill="rgba(255,255,255,.45)" fontSize="14" fontFamily="Inter, sans-serif">
            {p.s}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function MapVisual() {
  return (
    <div className="absolute inset-0">
      <svg viewBox="0 0 420 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <Terrain id="mv" />
        <rect width="420" height="300" fill="url(#mv-a)" />
        <rect width="420" height="300" fill="url(#mv-c)" />
        {PLOT_PATHS.map((d, i) => (
          <path key={d} d={d} fill={i === 2 ? "rgba(251,191,36,.18)" : "rgba(52,211,153,.18)"} stroke={i === 2 ? "#fbbf24" : "#34d399"} strokeWidth="2" strokeDasharray="600" className="animate-draw" style={{ animationDelay: `${i * 180}ms` }} />
        ))}
        {[
          [60, 70],
          [140, 58],
          [158, 128],
          [76, 142],
        ].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r="4.5" fill="white" stroke="#065f46" strokeWidth="2" />
        ))}
      </svg>
      <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-xs text-white/80 backdrop-blur">
        <MapPin className="h-4 w-4 text-emerald-300" /> Plot 1 · 4 GPS points · 1.84 ha · no overlaps
      </div>
    </div>
  );
}

export function ScaleVisual() {
  const rows = [
    ["Musa Bello", "Harvest 520 kg", "Collected 498 kg", true],
    ["Ada Okafor", "Harvest 410 kg", "Collected 402 kg", true],
    ["Tunde Bakare", "Harvest 300 kg", "Collected 386 kg", false],
  ] as const;
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-2 p-4 sm:gap-3 sm:p-7">
      {rows.map(([n, h, c, ok], i) => (
        <div key={n} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 animate-blur-in sm:p-4" style={{ animationDelay: `${i * 140}ms` }}>
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-emerald-400/15 text-xs font-bold text-emerald-200">
            {n
              .split(" ")
              .map((p) => p[0])
              .join("")}
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold text-white">{n}</p>
            <p className="text-white/50">
              {h} · {c}
            </p>
          </div>
          {ok ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-300" />
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
              <TriangleAlert className="h-3 w-3" /> +29%
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function BatchVisual() {
  return (
    <div className="absolute inset-0 p-7">
      <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden>
        {[50, 110, 170, 230].map((y, i) => (
          <g key={y}>
            <rect x="12" y={y - 20} width="118" height="40" rx="12" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.12)" />
            <text x="71" y={y + 5} textAnchor="middle" fill="rgba(255,255,255,.75)" fontSize="13" fontFamily="Inter">
              {["498 kg", "402 kg", "611 kg", "389 kg"][i]}
            </text>
            <path d={`M130 ${y} C 190 ${y}, 190 150, 250 150`} fill="none" stroke="#34d399" strokeOpacity=".5" strokeWidth="2" strokeDasharray="5 9" className="animate-dash-flow" />
          </g>
        ))}
        <rect x="250" y="110" width="138" height="80" rx="18" fill="rgba(52,211,153,.12)" stroke="#34d399" />
        <text x="319" y="143" textAnchor="middle" fill="white" fontSize="15" fontWeight="700" fontFamily="Plus Jakarta Sans, Inter">
          LOT-118
        </text>
        <text x="319" y="166" textAnchor="middle" fill="#a7f3d0" fontSize="13" fontFamily="Inter">
          1,900 kg = 1,900 kg
        </text>
      </svg>
    </div>
  );
}

export function ScoreVisual() {
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-8 p-7">
      <div className="relative h-40 w-40 flex-none">
        <svg viewBox="0 0 36 36" className="h-40 w-40 -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#5eea9a" strokeWidth="3" strokeLinecap="round" strokeDasharray="97.4" strokeDashoffset="0" className="animate-draw" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-5xl font-bold text-white">100</span>
          <span className="text-xs text-white/50">readiness</span>
        </div>
      </div>
      <ul className="hidden space-y-2.5 text-sm text-white/75 sm:block">
        {["Geolocation", "No loss after 2020", "Volumes reconcile", "Documents", "Evidence pack"].map((c, i) => (
          <li key={c} className="flex items-center gap-2 animate-blur-in" style={{ animationDelay: `${200 + i * 110}ms` }}>
            <CheckCircle2 className="h-4 w-4 text-emerald-300" /> {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Satellite-style tile with a scanning beam, for the screening section. */
export function ScanVisual() {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/10">
      <svg viewBox="0 0 420 300" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <Terrain id="sv" />
        <rect width="420" height="300" fill="url(#sv-a)" />
        <rect width="420" height="300" fill="url(#sv-c)" />
        <path d="M0 210 C 120 190, 200 240, 420 200 L420 300 L0 300 Z" fill="#3b4f2a" opacity=".55" />
        {PLOT_PATHS.map((d, i) => (
          <path key={d} d={d} fill={["rgba(52,211,153,.22)", "rgba(52,211,153,.22)", "rgba(251,191,36,.25)", "rgba(52,211,153,.22)", "rgba(248,113,113,.28)", "rgba(52,211,153,.22)"][i]} stroke={["#34d399", "#34d399", "#fbbf24", "#34d399", "#f87171", "#34d399"][i]} strokeWidth="2" />
        ))}
      </svg>
      <div className="absolute inset-x-0 top-0 h-1/3 animate-scan bg-gradient-to-b from-transparent via-emerald-300/25 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-px animate-scan bg-emerald-200/80 shadow-[0_0_20px_4px_rgba(110,231,183,.6)]" />
      <div className="absolute left-4 top-4 flex flex-wrap gap-2 text-[11px] font-medium">
        <span className="rounded-full bg-black/55 px-2.5 py-1 text-emerald-300 backdrop-blur">● 4 low risk</span>
        <span className="rounded-full bg-black/55 px-2.5 py-1 text-amber-300 backdrop-blur">● 1 needs evidence</span>
        <span className="rounded-full bg-black/55 px-2.5 py-1 text-red-300 backdrop-blur">● 1 high risk</span>
      </div>
      <div className="absolute bottom-4 right-4 rounded-full bg-black/55 px-3 py-1 text-[11px] text-white/60 backdrop-blur">Sample tile · cutoff 31 Dec 2020</div>
    </div>
  );
}

export function GeoJsonVisual() {
  return (
    <pre className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-[11.5px] leading-relaxed text-white/60">
      <span className="text-white/40">{"{"}</span>
      {"\n  "}
      <span className="text-emerald-300">&quot;type&quot;</span>: <span className="text-lime-200">&quot;Feature&quot;</span>,{"\n  "}
      <span className="text-emerald-300">&quot;geometry&quot;</span>: {"{ "}
      <span className="text-emerald-300">&quot;type&quot;</span>: <span className="text-lime-200">&quot;Polygon&quot;</span>,{"\n    "}
      <span className="text-emerald-300">&quot;coordinates&quot;</span>: [[[<span className="text-sky-300">5.110021</span>, <span className="text-sky-300">7.110384</span>], …]] {"}"},{"\n  "}
      <span className="text-emerald-300">&quot;properties&quot;</span>: {"{ "}
      <span className="text-emerald-300">&quot;ProducerCountry&quot;</span>: <span className="text-lime-200">&quot;NG&quot;</span>,{"\n    "}
      <span className="text-emerald-300">&quot;Area&quot;</span>: <span className="text-sky-300">1.84</span> {"}"}
      {"\n"}
      <span className="text-white/40">{"}"}</span>
    </pre>
  );
}

export function FingerprintVisual() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-4">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
        <Fingerprint className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-white/45">SHA-256 of evidence pack</p>
        <p className="truncate font-mono text-xs text-emerald-200">9f2c4e1ab07d33e8c5a1f6b42e0d9a77c18b3f5e6d2a0c94b7e1f8d3a6c2b510</p>
      </div>
    </div>
  );
}

export function AuditVisual() {
  const rows = [
    { who: "Ada", what: "ran readiness check · 100", t: "2m" },
    { who: "Musa", what: "mapped farm Idanre plot 6", t: "14m" },
    { who: "Kemi", what: "uploaded export certificate", t: "1h" },
  ];
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.what} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs">
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-400/15 text-[10px] font-bold text-emerald-200">{r.who[0]}</span>
          <span className="min-w-0 flex-1 truncate text-white/70">
            <b className="font-semibold text-white">{r.who}</b> {r.what}
          </span>
          <span className="text-white/35">{r.t}</span>
        </li>
      ))}
    </ul>
  );
}

export function ReadyChip() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
      <ShieldCheck className="h-3.5 w-3.5" /> Ready to ship <Ship className="h-3.5 w-3.5" />
    </div>
  );
}
