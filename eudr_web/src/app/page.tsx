import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  FileCheck2,
  History,
  LocateFixed,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trees,
  UsersRound,
  WifiOff,
  X,
} from "lucide-react";
import Link from "next/link";
import { Countdown, FaqItem, Nav, Reveal } from "@/components/landing/Interactive";
import { Counter, Marquee, ScrollTilt, Spotlight, StickySteps, WordReveal } from "@/components/landing/Fx";
import { Logo } from "@/components/landing/Logo";
import ProductMock from "@/components/landing/ProductMock";
import {
  AuditVisual,
  BatchVisual,
  FingerprintVisual,
  GeoJsonVisual,
  MapVisual,
  ReadyChip,
  ScaleVisual,
  ScanVisual,
  ScoreVisual,
  TraceJourney,
} from "@/components/landing/Visuals";

const APP = process.env.NEXT_PUBLIC_APP_NAME || "Ala Trace";
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
const demoHref = CONTACT ? `mailto:${CONTACT}?subject=${encodeURIComponent(`${APP}: free readiness check`)}` : "/register";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
      <span className="h-1 w-1 rounded-full bg-emerald-300" />
      {children}
    </span>
  );
}

function H2({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`mt-5 font-display text-4xl font-bold leading-[1.04] tracking-[-0.03em] text-white sm:text-6xl ${className}`}>{children}</h2>;
}

function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] opacity-[0.035] mix-blend-overlay"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
}

const TICKER = [
  "Regulation (EU) 2023/1115",
  "Plot-level geolocation",
  "WGS84 · 6 decimal places",
  "31 Dec 2020 cutoff",
  "Whisp · FAO & Forest Data Partnership",
  "JRC Global Forest Cover 2020",
  "Hansen Global Forest Change",
  "ESA WorldCover",
  "GeoJSON for the EU Information System",
  "HS 1801 · 4001 · 1511",
  "Due diligence statements",
  "Chain of custody",
];

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-clip bg-[#030b07] text-white selection:bg-emerald-300/30">
      <Grain />
      <Nav />

      {/* ═════════ HERO ═════════ */}
      <section className="relative pt-32 sm:pt-40">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-[-18rem] h-[44rem] w-[70rem] -translate-x-1/2 animate-aurora rounded-full bg-[conic-gradient(from_180deg_at_50%_50%,#065f46_0deg,#34d399_90deg,#bef264_160deg,#0f766e_250deg,#065f46_360deg)] opacity-[0.28] blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.09]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,.55) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.55) 1px,transparent 1px)",
              backgroundSize: "72px 72px",
              maskImage: "radial-gradient(ellipse 60% 50% at 50% 20%, black 20%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6">
          <div className="animate-blur-in">
            <a
              href="#faq"
              className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-xs font-medium text-white/75 backdrop-blur transition hover:border-white/20"
            >
              <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#03130b]">EUDR</span>
              Applies to large &amp; medium EU buyers from 30 Dec 2026
              <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
            </a>
          </div>

          <h1 className="mx-auto mt-8 max-w-5xl font-display text-[2.9rem] font-extrabold leading-[0.98] tracking-[-0.045em] sm:text-7xl lg:text-[6.4rem]">
            <WordReveal text="Trace every bag." start={120} />
            <br />
            <WordReveal text="Ship every container." start={380} gradientFrom={0} />
          </h1>

          <p className="mx-auto mt-8 max-w-2xl animate-blur-in text-lg leading-relaxed text-white/60 sm:text-xl" style={{ animationDelay: "700ms" }}>
            The compliance engine for African cocoa, rubber and palm oil exporters. Map every farm, screen every plot for deforestation, and hand your EU
            buyer an evidence pack they can file, before the container leaves Apapa.
          </p>

          <div className="mt-10 flex animate-blur-in flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "850ms" }}>
            <Link
              href="/register"
              className="group relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-full bg-white px-7 text-[15px] font-semibold text-[#03130b] transition hover:scale-[1.02]"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald-200/70 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">Start free</span>
              <ArrowRight className="relative h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <a
              href={demoHref}
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-7 text-[15px] font-medium text-white backdrop-blur transition hover:bg-white/[0.08]"
            >
              Book a free readiness check <ArrowUpRight className="h-4 w-4 text-white/60" />
            </a>
          </div>
          <p className="mt-5 animate-blur-in text-xs text-white/40" style={{ animationDelay: "950ms" }}>
            No card needed · Set up in two minutes · Your data stays yours
          </p>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl px-4 sm:mt-20 sm:px-6">
          <div aria-hidden className="absolute inset-x-10 -top-10 h-72 rounded-full bg-emerald-400/20 blur-[100px]" />
          <ScrollTilt>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-2 shadow-[0_60px_160px_-40px_rgba(16,185,129,.35)] backdrop-blur sm:p-3">
              <div className="mx-auto max-w-[720px] py-4 sm:py-8">
                <ProductMock />
              </div>
            </div>
          </ScrollTilt>
        </div>

        <div className="relative mx-auto mt-20 max-w-6xl px-4 sm:px-6">
          <Reveal>
            <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-white/35">One unbroken chain, farm to port to buyer</p>
            <div className="mt-6 overflow-x-auto rounded-3xl border border-white/[0.07] bg-white/[0.02] px-4 py-6 sm:px-8">
              <div className="min-w-[760px]">
                <TraceJourney />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═════════ TICKER ═════════ */}
      <section className="mt-24 border-y border-white/[0.06] py-6">
        <Marquee
          items={TICKER.map((t) => (
            <span key={t} className="inline-flex items-center gap-3 px-3 text-sm font-medium text-white/45">
              <span className="h-1.5 w-1.5 rotate-45 bg-emerald-400/70" />
              {t}
            </span>
          ))}
        />
      </section>

      {/* ═════════ NUMBERS ═════════ */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.07] lg:grid-cols-4">
          {[
            { v: <Counter to={21} />, l: "automated compliance checks on every shipment" },
            { v: <Counter to={6} />, l: "decimal places of GPS precision, as the EU requires" },
            { v: <Counter to={2020} />, l: "deforestation cutoff year every plot is screened against" },
            { v: <Counter to={0} />, l: "apps to install. Field agents use any phone browser" },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 80} className="h-full">
              <div className="h-full bg-[#030b07] p-6 sm:p-8">
                <p className="font-display text-5xl font-bold tracking-tight text-white sm:text-6xl">{s.v}</p>
                <p className="mt-3 text-sm leading-relaxed text-white/50">{s.l}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═════════ PROBLEM ═════════ */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 sm:pb-32">
        <Reveal>
          <Eyebrow>What changed</Eyebrow>
          <H2 className="max-w-4xl">
            Your buyer now has to prove where every kilo came from. <span className="text-white/35">They can&apos;t do it without you.</span>
          </H2>
        </Reveal>
        <div className="mt-16 divide-y divide-white/[0.07] border-y border-white/[0.07]">
          {[
            { n: "01", icon: LocateFixed, t: "The exact plot", b: "GPS coordinates of every farm in the shipment, with polygons for plots over 4 hectares, in a format the EU Information System accepts." },
            { n: "02", icon: Trees, t: "No deforestation after 2020", b: "Evidence that none of those plots were forest cleared after 31 December 2020, the regulation's cutoff date." },
            { n: "03", icon: Boxes, t: "An unbroken chain of custody", b: "Proof that the beans in the container are the beans weighed at those farms. No mixing, no phantom volume." },
          ].map((r, i) => (
            <Reveal key={r.n} delay={i * 90}>
              <div className="group grid grid-cols-[auto_1fr] items-start gap-5 py-8 sm:grid-cols-[120px_1fr_1.3fr] sm:gap-10 sm:py-10">
                <span className="font-display text-sm font-bold tracking-[0.2em] text-white/30 transition group-hover:text-emerald-300">{r.n}</span>
                <h3 className="flex items-center gap-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  <r.icon className="hidden h-6 w-6 text-emerald-300 sm:block" /> {r.t}
                </h3>
                <p className="col-span-2 text-lg leading-relaxed text-white/55 sm:col-span-1">{r.b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═════════ HOW IT WORKS ═════════ */}
      <section id="how" className="relative scroll-mt-20 border-t border-white/[0.06] bg-[#04100a] py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="max-w-3xl">
            <Eyebrow>How it works</Eyebrow>
            <H2>From farm gate to port, in four moves.</H2>
          </Reveal>
          <div className="mt-10">
            <StickySteps
              steps={[
                { n: "01", t: "Map every farm", b: "Draw the boundary on satellite imagery, paste coordinates, or walk the edge with a phone. Overlaps, duplicates and impossible sizes are caught as you go.", visual: <MapVisual /> },
                { n: "02", t: "Record what you buy", b: "Log farmer-reported harvests and agent-weighed collections. When a collection doesn't fit what a farm can produce, it's flagged before it reaches a batch.", visual: <ScaleVisual /> },
                { n: "03", t: "Batch and ship", b: "Group collections into lots and lots into shipments. Inputs must equal outputs, and the same kilo can never be shipped twice.", visual: <BatchVisual /> },
                { n: "04", t: "Score and send", b: "21 checks produce one readiness score. Anything critical blocks the shipment. Fix what's listed, then send your buyer the evidence pack.", visual: <ScoreVisual /> },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ═════════ SCREENING ═════════ */}
      <section id="screening" className="relative scroll-mt-20 overflow-hidden py-24 sm:py-32">
        <div aria-hidden className="pointer-events-none absolute -right-40 top-20 h-[36rem] w-[36rem] rounded-full bg-emerald-500/10 blur-[140px]" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
          <Reveal className="min-w-0">
            <Eyebrow>Deforestation screening</Eyebrow>
            <H2>See the problem plot before your buyer&apos;s auditor does.</H2>
            <p className="mt-6 text-lg leading-relaxed text-white/55">
              Every plot is checked with <b className="font-semibold text-white">Whisp</b>, the open-source EUDR tool from FAO and the Forest Data Partnership,
              against public satellite datasets of forest cover and land use.
            </p>
            <div className="mt-8 space-y-3">
              {[
                { icon: ShieldCheck, c: "text-emerald-300 bg-emerald-400/10", t: "Low risk", b: "No forest loss after 2020, or already farmland. Ready." },
                { icon: ShieldAlert, c: "text-amber-300 bg-amber-400/10", t: "Needs evidence", b: "Tree cover in 2020, common for shade cocoa. Collect proof." },
                { icon: X, c: "text-red-300 bg-red-400/10", t: "High risk", b: "Clearing after 2020. Shipment blocked until resolved." },
              ].map((r) => (
                <div key={r.t} className="flex items-start gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${r.c}`}>
                    <r.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold">{r.t}</p>
                    <p className="text-sm text-white/50">{r.b}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={120} className="min-w-0">
            <div className="relative">
              <div aria-hidden className="absolute -inset-6 rounded-[2rem] bg-emerald-400/10 blur-2xl" />
              <div className="relative">
                <ScanVisual />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═════════ PLATFORM BENTO ═════════ */}
      <section id="platform" className="scroll-mt-20 border-t border-white/[0.06] bg-[#04100a] py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="max-w-3xl">
            <Eyebrow>The platform</Eyebrow>
            <H2>
              Built like audit software. <span className="text-white/35">Because that&apos;s what it is.</span>
            </H2>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-6">
            <Reveal className="md:col-span-4">
              <Spotlight className="h-full p-7">
                <FileCheck2 className="h-6 w-6 text-emerald-300" />
                <h3 className="mt-4 font-display text-2xl font-bold">GeoJSON the EU system accepts</h3>
                <p className="mt-2 max-w-md text-white/55">Plot polygons in WGS84 at six decimal places with producer country and area, ready for your buyer&apos;s due diligence statement.</p>
                <div className="mt-6">
                  <GeoJsonVisual />
                </div>
              </Spotlight>
            </Reveal>
            <Reveal delay={80} className="md:col-span-2">
              <Spotlight className="flex h-full flex-col justify-between p-7">
                <div>
                  <p className="text-sm text-white/45">Shipment readiness</p>
                  <p className="mt-1 font-display text-7xl font-bold tracking-tight">
                    <Counter to={100} />
                  </p>
                </div>
                <div className="mt-6">
                  <ReadyChip />
                  <p className="mt-3 text-sm text-white/50">Any critical problem blocks the shipment, whatever the score.</p>
                </div>
              </Spotlight>
            </Reveal>
            <Reveal className="md:col-span-2">
              <Spotlight className="h-full p-7">
                <History className="h-6 w-6 text-emerald-300" />
                <h3 className="mt-4 font-display text-xl font-bold">Permanent activity log</h3>
                <p className="mt-2 text-sm text-white/55">Who changed what, and when. Entries can&apos;t be edited or deleted, even by us.</p>
                <div className="mt-5">
                  <AuditVisual />
                </div>
              </Spotlight>
            </Reveal>
            <Reveal delay={80} className="md:col-span-2">
              <Spotlight className="h-full p-7">
                <Lock className="h-6 w-6 text-emerald-300" />
                <h3 className="mt-4 font-display text-xl font-bold">Tamper-evident evidence</h3>
                <p className="mt-2 text-sm text-white/55">Every pack carries a fingerprint of its contents, so a buyer can tell if anything changed after export.</p>
                <div className="mt-5">
                  <FingerprintVisual />
                </div>
              </Spotlight>
            </Reveal>
            <Reveal delay={160} className="md:col-span-2">
              <Spotlight className="h-full p-7">
                <UsersRound className="h-6 w-6 text-emerald-300" />
                <h3 className="mt-4 font-display text-xl font-bold">Roles for the whole team</h3>
                <p className="mt-2 text-sm text-white/55">Field agents map farms. Staff run batches. Reviewers run checks. Each person signs in as themselves.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {["Admin", "Exporter staff", "Compliance reviewer", "Field agent"].map((r) => (
                    <span key={r} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70">
                      {r}
                    </span>
                  ))}
                </div>
              </Spotlight>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═════════ BEFORE / AFTER ═════════ */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Eyebrow>Why switch</Eyebrow>
          <H2>Spreadsheets won&apos;t survive an EU audit.</H2>
        </Reveal>
        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-3xl border border-white/[0.07] bg-white/[0.02] p-7 sm:p-9">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/35">Today</p>
              <ul className="mt-6 space-y-4">
                {[
                  "GPS points in WhatsApp chats and Excel tabs",
                  "No way to know if a plot was forest in 2020",
                  "Volumes that don't add up from farm to container",
                  "Buyer asks for evidence, you scramble for weeks",
                  "No record of who changed what",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-white/50">
                    <X className="mt-0.5 h-5 w-5 flex-none text-red-400/70" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="relative h-full overflow-hidden rounded-3xl border border-emerald-300/20 bg-gradient-to-br from-emerald-400/[0.12] to-transparent p-7 sm:p-9">
              <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
              <p className="relative text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">With {APP}</p>
              <ul className="relative mt-6 space-y-4">
                {[
                  "Every plot mapped, validated and on one map",
                  "Every plot screened against satellite data",
                  "Mass balance checked automatically at every step",
                  "Evidence pack and GeoJSON in one click",
                  "Permanent, tamper-proof activity history",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-white/85">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-300" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═════════ BUILT FOR NIGERIA ═════════ */}
      <section className="border-t border-white/[0.06] bg-[#04100a] py-24 sm:py-32">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
          <Reveal>
            <Eyebrow>Built in Lagos</Eyebrow>
            <H2>For the exporters the big platforms skip.</H2>
            <p className="mt-6 text-lg leading-relaxed text-white/55">
              Global traceability tools are priced and designed for multinationals. {APP} is built for Nigerian exporters, aggregators and cooperatives, and
              the way cocoa actually moves here.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {["Cocoa", "Natural rubber", "Oil palm", "Coffee", "Soya", "Wood", "Cattle"].map((c, i) => (
                <span key={c} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${i < 3 ? "bg-emerald-400 text-[#03130b]" : "border border-white/10 text-white/50"}`}>
                  {c}
                </span>
              ))}
            </div>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { icon: Smartphone, t: "Walk the boundary", b: "Field agents map farms from a phone browser. No app store, no special device." },
              { icon: WifiOff, t: "Low-bandwidth friendly", b: "Light pages for weak rural connections. Paste coordinates collected offline." },
              { icon: UsersRound, t: "Farmer-first records", b: "NIN, community and state for every farmer, with ID and land documents attached." },
              { icon: Lock, t: "Your data stays yours", b: "Each company's records are fully separated. No one else sees your farms or volumes." },
            ].map((f, i) => (
              <Reveal key={f.t} delay={i * 80}>
                <Spotlight className="h-full p-6">
                  <f.icon className="h-6 w-6 text-emerald-300" />
                  <h3 className="mt-4 font-semibold">{f.t}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/50">{f.b}</p>
                </Spotlight>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════ PILOT ═════════ */}
      <section id="pilot" className="scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32">
        <Reveal>
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-white/10 px-6 py-16 text-center sm:px-14 sm:py-24">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(52,211,153,.35),transparent_70%)]" />
            <div aria-hidden className="absolute left-1/2 top-1/2 h-[46rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 animate-spin-slow rounded-full border border-dashed border-white/[0.07]" />
            <div aria-hidden className="absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 animate-spin-slow rounded-full border border-white/[0.05] [animation-direction:reverse]" />
            <div className="relative">
              <Eyebrow>Pilot programme</Eyebrow>
              <h2 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.04em] sm:text-7xl">
                Your next shipment, <span className="bg-gradient-to-r from-emerald-300 to-lime-200 bg-clip-text text-transparent">checked free.</span>
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg text-white/60">
                We&apos;ll help you map the farms behind one shipment, screen them, and show you its readiness score and evidence pack. No contract, no card.
              </p>
              <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                <a href={demoHref} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-[15px] font-semibold text-[#03130b] transition hover:scale-[1.02]">
                  Request a free check <ArrowRight className="h-4 w-4" />
                </a>
                <Link href="/register" className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-7 text-[15px] font-medium text-white transition hover:bg-white/[0.08]">
                  Try it yourself
                </Link>
              </div>
              <div className="mt-12 flex justify-center">
                <Countdown />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ═════════ FAQ ═════════ */}
      <section id="faq" className="scroll-mt-20 border-t border-white/[0.06] py-24 sm:py-32">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
          <Reveal>
            <Eyebrow>FAQ</Eyebrow>
            <H2 className="sm:text-5xl">Questions exporters ask us</H2>
            <p className="mt-5 text-white/45">Not legal advice. Always confirm your obligations with your buyer and a qualified adviser.</p>
          </Reveal>
          <Reveal delay={100}>
            <div className="border-t border-white/10">
              <FaqItem dark q="When does the EUDR start to apply?">
                Under Regulation (EU) 2025/2650, the main obligations apply from 30 December 2026 for large and medium operators, and from 30 June 2027 for
                micro and small operators. The EU has changed these dates before, so check the latest position with your buyer.
              </FaqItem>
              <FaqItem dark q="I'm a Nigerian exporter. Is this my legal obligation?">
                The legal duty sits with the company placing the product on the EU market, usually your importer. But they can only meet it with farm-level
                data from you, so in practice buyers are asking exporters for geolocation and evidence before they buy.
              </FaqItem>
              <FaqItem dark q="What exactly does the buyer need from me?">
                The geolocation of every plot the commodity came from, the quantity and HS code, the country of production, and enough supporting information to
                show the risk of deforestation after 31 December 2020 is negligible. The evidence pack is built around exactly that.
              </FaqItem>
              <FaqItem dark q="How does deforestation screening work?">
                We send each plot&apos;s boundary to Whisp, an open-source tool from FAO and the Forest Data Partnership, which checks it against public satellite
                datasets for tree cover and farmland in 2020 and disturbance before and after. It returns low risk, needs evidence, or high risk. It is a risk
                indication, not a certificate.
              </FaqItem>
              <FaqItem dark q="Do my field agents need a special app?">
                No. They use the web app in any modern phone browser, and can drop GPS points while walking a farm boundary or paste coordinates collected
                another way.
              </FaqItem>
              <FaqItem dark q="Who can see my data?">
                Only people you invite to your company account, each with their own login and role. Every record is scoped to your organisation, and every
                change is recorded in a log that can&apos;t be edited.
              </FaqItem>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═════════ FOOTER ═════════ */}
      <footer className="relative overflow-hidden border-t border-white/[0.06] pt-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-10 md:flex-row md:items-end">
            <div>
              <h2 className="max-w-xl font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl">Don&apos;t lose the EU market over paperwork.</h2>
              <Link href="/register" className="group mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-emerald-400 px-7 text-[15px] font-semibold text-[#03130b] transition hover:bg-emerald-300">
                Create your free account <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm text-white/50">
              <a href="#how" className="hover:text-white">
                How it works
              </a>
              <a href="#screening" className="hover:text-white">
                Screening
              </a>
              <a href="#platform" className="hover:text-white">
                Platform
              </a>
              <a href="#pilot" className="hover:text-white">
                Pilot
              </a>
              <a href="#faq" className="hover:text-white">
                FAQ
              </a>
              <Link href="/login" className="hover:text-white">
                Sign in
              </Link>
            </div>
          </div>
          <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] py-6 text-xs text-white/35 md:flex-row">
            <div className="flex items-center gap-2.5 text-white/70">
              <Logo size={22} />
              <span className="font-semibold">{APP}</span>
              <span className="text-white/35">· Made in Lagos</span>
            </div>
            <p>Deforestation screening powered by Whisp (FAO / Forest Data Partnership, MIT licence).</p>
          </div>
        </div>
        <p
          aria-hidden
          className="pointer-events-none select-none whitespace-nowrap text-center font-display text-[16.5vw] font-extrabold leading-[0.8] tracking-[-0.06em] text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,.08)] [mask-image:linear-gradient(to_bottom,black_30%,transparent)]"
        >
          ALA TRACE
        </p>
      </footer>
    </div>
  );
}
