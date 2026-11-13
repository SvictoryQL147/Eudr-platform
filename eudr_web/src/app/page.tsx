import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  FileCheck2,
  FileJson,
  Fingerprint,
  Globe2,
  LocateFixed,
  Map,
  Radar,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Ship,
  Smartphone,
  Trees,
  UsersRound,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { Countdown, CountUp, FaqItem, Nav, Reveal } from "@/components/landing/Interactive";
import { Logo } from "@/components/landing/Logo";
import ProductMock from "@/components/landing/ProductMock";

const APP = process.env.NEXT_PUBLIC_APP_NAME || "EUDR Ready";
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
const demoHref = CONTACT ? `mailto:${CONTACT}?subject=${encodeURIComponent(`${APP} — free readiness check`)}` : "/register";

function SectionHead({ eyebrow, title, body, dark }: { eyebrow: string; title: React.ReactNode; body?: string; dark?: boolean }) {
  return (
    <Reveal className="mx-auto max-w-3xl text-center">
      <p className={`text-sm font-semibold uppercase tracking-[0.18em] ${dark ? "text-emerald-300" : "text-emerald-700"}`}>{eyebrow}</p>
      <h2 className={`mt-3 text-3xl font-semibold tracking-tight sm:text-[2.6rem] sm:leading-[1.1] ${dark ? "text-white" : "text-stone-900"}`}>{title}</h2>
      {body && <p className={`mt-4 text-lg leading-relaxed ${dark ? "text-emerald-50/65" : "text-stone-600"}`}>{body}</p>}
    </Reveal>
  );
}

export default function Landing() {
  return (
    <div className="bg-white text-stone-900">
      <Nav />

      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden bg-[#06150f] pb-24 pt-32 sm:pb-32 sm:pt-40">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-emerald-500/20 blur-[120px]" />
          <div className="absolute -right-32 top-24 h-[420px] w-[420px] rounded-full bg-lime-400/10 blur-[110px]" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)", backgroundSize: "56px 56px", maskImage: "radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%)" }}
          />
        </div>
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-8">
          <div className="min-w-0">
            <Reveal>
              <a href="#faq" className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-200 transition hover:bg-emerald-300/15">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-300" />
                EU Deforestation Regulation applies from 30 Dec 2026
              </a>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 text-[2.4rem] font-semibold leading-[1.06] [overflow-wrap:anywhere] tracking-tight text-white sm:text-6xl lg:text-[4.1rem]">
                Every bag traced <br className="hidden sm:block" />
                to the farm.{" "}
                <span className="bg-gradient-to-r from-emerald-300 via-lime-200 to-emerald-400 bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer">Every shipment ready for the EU.</span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-emerald-50/70">
                {APP} helps Nigerian cocoa, rubber and palm oil exporters map every farm, screen it for deforestation, and hand EU buyers a
                due-diligence evidence pack they can file — before the shipment leaves Lagos.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-400 px-7 text-[15px] font-semibold text-[#06150f] shadow-[0_0_40px_rgba(52,211,153,.35)] transition hover:bg-emerald-300">
                  Start free <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
                <a href={demoHref} className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/20 px-7 text-[15px] font-medium text-white transition hover:bg-white/10">
                  Get a free readiness check
                </a>
              </div>
            </Reveal>
            <Reveal delay={320}>
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-emerald-50/55">
                {["Plot-level GeoJSON for TRACES", "Satellite deforestation screening", "Built for Nigerian supply chains"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" /> {t}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
          <Reveal delay={200} className="min-w-0">
            <ProductMock />
          </Reveal>
        </div>
      </section>

      {/* ---------------- DEADLINE STRIP ---------------- */}
      <section className="relative border-y border-emerald-900/40 bg-gradient-to-r from-[#0a2a1d] via-[#0d3524] to-[#0a2a1d]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 py-7 sm:px-6 md:flex-row lg:px-8">
          <div className="text-center md:text-left">
            <p className="text-sm font-medium text-emerald-300">Countdown to EUDR for large &amp; medium EU buyers</p>
            <p className="mt-1 text-sm text-emerald-50/60">After this date, every shipment they place on the EU market needs plot geolocation and a due diligence statement.</p>
          </div>
          <Countdown />
        </div>
      </section>

      {/* ---------------- PROBLEM ---------------- */}
      <section className="bg-stone-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHead
            eyebrow="What changes"
            title={<>Your EU buyers now have to prove where every kilo came from.</>}
            body="Under Regulation (EU) 2023/1115 the importer files a due diligence statement for each shipment. They can't do it without data only you can collect."
          />
          <div className="mt-16 grid gap-5 md:grid-cols-3">
            {[
              { icon: LocateFixed, t: "The exact plot", b: "GPS coordinates of every farm the cocoa came from — polygons for plots over 4 hectares — in a format the EU system accepts." },
              { icon: Trees, t: "No deforestation after 2020", b: "Evidence that none of those plots were forest cleared after 31 December 2020, the regulation's cutoff date." },
              { icon: Boxes, t: "An unbroken chain", b: "Proof that the beans in the container are the same beans weighed at those farms — no mixing, no phantom volume." },
            ].map((c, i) => (
              <Reveal key={c.t} delay={i * 90}>
                <div className="group h-full rounded-2xl border border-stone-200 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,.04)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(6,21,15,.25)]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                    <c.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{c.t}</h3>
                  <p className="mt-2 leading-relaxed text-stone-600">{c.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="mx-auto mt-12 max-w-2xl text-center text-stone-500">
              Exporters who can&apos;t supply this risk losing EU contracts or selling at a discount to buyers who can absorb the risk.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section id="how" className="scroll-mt-16 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHead eyebrow="How it works" title="From the farm gate to the port, in four steps." />
          <div className="relative mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="absolute left-0 right-0 top-[38px] hidden h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent lg:block" aria-hidden />
            {[
              { n: "01", icon: Map, t: "Map every farm", b: "Draw the boundary on satellite imagery, paste coordinates, or walk the edge with a phone and drop GPS points." },
              { n: "02", icon: Scale, t: "Record what you buy", b: "Log farmer-reported harvests and agent-weighed collections. Weights are checked against each other automatically." },
              { n: "03", icon: Ship, t: "Batch and ship", b: "Group collections into lots and lots into shipments. The same kilo can never be counted twice." },
              { n: "04", icon: FileCheck2, t: "Score and send", b: "21 checks give each shipment a readiness score. Fix what's flagged, then send the buyer the evidence pack." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 100}>
                <div className="relative h-full rounded-2xl border border-stone-200 bg-white p-6">
                  <div className="flex items-center justify-between">
                    <div className="relative z-10 flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[#06150f] text-emerald-300 shadow-lg">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <span className="text-4xl font-semibold text-stone-100">{s.n}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{s.t}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-stone-600">{s.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- SCREENING ---------------- */}
      <section id="screening" className="relative scroll-mt-16 overflow-hidden bg-[#06150f] py-24 sm:py-32">
        <div className="pointer-events-none absolute right-0 top-0 h-[480px] w-[480px] rounded-full bg-emerald-500/15 blur-[120px]" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="min-w-0">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">Deforestation screening</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-[2.6rem] sm:leading-[1.1]">Know which plots are a problem before your buyer does.</h2>
              <p className="mt-5 text-lg leading-relaxed text-emerald-50/65">
                Each plot is checked with <b className="font-semibold text-white">Whisp</b>, the open-source EUDR tool from FAO and the Forest Data Partnership. It
                compares the plot against many public satellite datasets and answers the questions a buyer&apos;s auditor will ask.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <ul className="mt-8 space-y-3">
                {["Was there tree cover at the end of 2020?", "Was it already farmland or a commodity crop?", "Was it cleared before 2021?", "Has it been cleared since?"].map((q) => (
                  <li key={q} className="flex items-center gap-3 text-emerald-50/85">
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                    {q}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <div className="grid gap-4">
            {[
              { icon: ShieldCheck, tone: "emerald", t: "Low risk", b: "No sign of forest cleared after 2020, or the plot was already farmland. Ready for the EU." },
              { icon: ShieldAlert, tone: "amber", t: "Needs evidence", b: "Tree cover in 2020 with no farmland on record — common for shade-grown cocoa. Collect proof the farm existed before 2021." },
              { icon: Radar, tone: "red", t: "High risk", b: "Tree cover in 2020 and clearing after it. The shipment is blocked until a field check resolves it." },
            ].map((r, i) => (
              <Reveal key={r.t} delay={i * 110}>
                <div className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur transition hover:bg-white/[0.07]">
                  <div
                    className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl ${
                      r.tone === "emerald" ? "bg-emerald-400/15 text-emerald-300" : r.tone === "amber" ? "bg-amber-400/15 text-amber-300" : "bg-red-400/15 text-red-300"
                    }`}
                  >
                    <r.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{r.t}</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-emerald-50/60">{r.b}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- READINESS + EVIDENCE ---------------- */}
      <section id="evidence" className="scroll-mt-16 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHead
            eyebrow="Readiness score & evidence pack"
            title="One number tells you if a shipment can go. One file proves it."
            body="Every farm, farmer, collection, batch and document in a shipment goes through 21 checks. Anything critical blocks the shipment, whatever the score."
          />
          <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.25fr]">
            <Reveal>
              <div className="flex h-full flex-col justify-between rounded-3xl bg-gradient-to-br from-[#06150f] to-[#0f3a27] p-8 text-white">
                <div>
                  <p className="text-sm text-emerald-200/70">Shipment readiness</p>
                  <p className="mt-2 flex items-end gap-2">
                    <CountUp to={100} className="text-7xl font-semibold tabular-nums" />
                    <span className="mb-3 text-emerald-200/60">/ 100</span>
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-medium text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" /> All 21 checks passed
                  </span>
                </div>
                <div className="mt-10 grid grid-cols-2 gap-3 text-sm">
                  {["Farm geolocation & shape", "Duplicate & overlapping plots", "Harvest vs collection weights", "Batch input = output", "Farmer ID & documents", "Deforestation result"].map((c) => (
                    <div key={c} className="flex items-start gap-2 text-emerald-50/75">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-300" /> {c}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            <div className="grid gap-6 sm:grid-cols-2">
              {[
                { icon: FileJson, t: "GeoJSON for the EU system", b: "Plot polygons in WGS84 at six decimal places with producer, country, place and area — the shape the EU Information System expects." },
                { icon: FileCheck2, t: "Printable evidence pack", b: "Product, quantity, HS code, chain of custody, per-plot screening results and documents in one PDF your buyer can file." },
                { icon: Fingerprint, t: "Tamper-evident", b: "Every pack carries a SHA-256 fingerprint of its contents, so a buyer can tell if anything was changed after export." },
                { icon: Globe2, t: "Honest by design", b: "If a plot hasn't been screened or a document is missing, the pack says so. Nothing is implied that wasn't checked." },
              ].map((f, i) => (
                <Reveal key={f.t} delay={i * 80}>
                  <div className="h-full rounded-2xl border border-stone-200 p-6 transition hover:border-emerald-300 hover:shadow-[0_18px_40px_-20px_rgba(6,21,15,.25)]">
                    <f.icon className="h-6 w-6 text-emerald-700" />
                    <h3 className="mt-4 font-semibold">{f.t}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-stone-600">{f.b}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- BUILT FOR NIGERIA ---------------- */}
      <section className="bg-stone-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHead eyebrow="Built for Nigeria" title="Made for the way Nigerian cocoa actually moves." body="Big traceability platforms are built for multinationals. This one is built for the exporters, aggregators and cooperatives they skip." />
          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Smartphone, t: "Walk the boundary", b: "Field agents map farms from a phone browser — no app store, no special device." },
              { icon: WifiOff, t: "Low-bandwidth friendly", b: "Light pages that load on weak rural connections. Paste coordinates collected offline." },
              { icon: UsersRound, t: "Farmer-first records", b: "NIN, community and state for every farmer, with their ID and land documents attached." },
              { icon: ShieldCheck, t: "Your data stays yours", b: "Each company's records are fully separated. No other exporter can see your farms or volumes." },
            ].map((f, i) => (
              <Reveal key={f.t} delay={i * 80}>
                <div className="h-full rounded-2xl bg-white p-6 ring-1 ring-stone-200">
                  <f.icon className="h-6 w-6 text-emerald-700" />
                  <h3 className="mt-4 font-semibold">{f.t}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-stone-600">{f.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="mt-14 flex flex-wrap items-center justify-center gap-2.5">
              <span className="mr-2 text-sm text-stone-500">Commodities covered by EUDR:</span>
              {["Cocoa", "Natural rubber", "Oil palm", "Coffee", "Soya", "Wood", "Cattle"].map((c, i) => (
                <span key={c} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${i < 3 ? "bg-emerald-700 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200"}`}>
                  {c}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- PILOT ---------------- */}
      <section id="pilot" className="scroll-mt-16 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] bg-[#06150f] px-6 py-14 text-center sm:px-14 sm:py-20">
              <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/25 blur-[90px]" aria-hidden />
              <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-lime-300/15 blur-[90px]" aria-hidden />
              <div className="relative">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">Pilot programme</p>
                <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-[1.08]">Get your next shipment checked — free.</h2>
                <p className="mx-auto mt-5 max-w-xl text-lg text-emerald-50/65">
                  We&apos;ll help you map the farms behind one shipment, screen them, and show you its readiness score and evidence pack. No contract, no card.
                </p>
                <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                  <a href={demoHref} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-400 px-7 text-[15px] font-semibold text-[#06150f] transition hover:bg-emerald-300">
                    Request a free check <ArrowRight className="h-4 w-4" />
                  </a>
                  <Link href="/register" className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-7 text-[15px] font-medium text-white transition hover:bg-white/10">
                    Try it yourself
                  </Link>
                </div>
                <div className="mx-auto mt-10 flex max-w-md justify-center">
                  <Countdown compact />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="scroll-mt-16 bg-stone-50 py-24 sm:py-32">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr] lg:px-8">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Questions exporters ask us</h2>
            <p className="mt-4 text-stone-600">Not legal advice — always confirm your obligations with your buyer and a qualified adviser.</p>
          </Reveal>
          <Reveal delay={100}>
            <div className="border-t border-stone-200">
              <FaqItem q="When does the EUDR start to apply?">
                Under Regulation (EU) 2025/2650, the main obligations apply from 30 December 2026 for large and medium operators, and from 30 June 2027 for
                micro and small operators. The EU has amended these dates before, so check the latest position with your buyer.
              </FaqItem>
              <FaqItem q="I'm a Nigerian exporter. Is this my legal obligation?">
                The legal duty sits with the company placing the product on the EU market — usually your importer. But they can only meet it with farm-level
                data from you, so in practice buyers are asking exporters for geolocation and evidence before they buy.
              </FaqItem>
              <FaqItem q="What exactly does the buyer need from me?">
                The geolocation of every plot the commodity came from, the quantity and HS code, the country of production, and enough supporting information
                to show the risk of deforestation after 31 December 2020 is negligible. The evidence pack is built around exactly that.
              </FaqItem>
              <FaqItem q="How does deforestation screening work?">
                We send each plot&apos;s boundary to Whisp, an open-source tool from FAO and the Forest Data Partnership, which checks it against public satellite
                datasets for tree cover in 2020, farmland in 2020, and disturbance before and after 2020. It returns low risk, needs evidence, or high risk. It is
                a risk indication, not a certificate.
              </FaqItem>
              <FaqItem q="Do my field agents need a special app?">
                No. They use the web app in any modern phone browser. They can drop GPS points while walking a farm boundary, or you can paste coordinates
                collected another way.
              </FaqItem>
              <FaqItem q="Who can see my data?">
                Only people you add to your company account. Every record is scoped to your organisation, and evidence packs are generated only when you choose
                to send them.
              </FaqItem>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- FINAL CTA + FOOTER ---------------- */}
      <section className="relative overflow-hidden bg-[#06150f] py-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" aria-hidden />
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-[1.08]">
              Don&apos;t lose the EU market <br className="hidden sm:block" /> over paperwork.
            </h2>
            <p className="mt-5 text-lg text-emerald-50/65">Set up your company in two minutes and map your first farm today.</p>
            <Link href="/register" className="mt-9 inline-flex h-12 items-center gap-2 rounded-full bg-emerald-400 px-8 text-[15px] font-semibold text-[#06150f] shadow-[0_0_40px_rgba(52,211,153,.35)] transition hover:bg-emerald-300">
              Create your free account <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>
      <footer className="border-t border-white/10 bg-[#041009] py-10 text-sm text-emerald-50/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 sm:px-6 md:flex-row lg:px-8">
          <div className="flex items-center gap-2.5 text-white">
            <Logo size={28} />
            <span className="font-semibold">{APP}</span>
            <span className="text-emerald-50/40">· Made in Lagos</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <a href="#how" className="hover:text-white">
              How it works
            </a>
            <a href="#screening" className="hover:text-white">
              Screening
            </a>
            <a href="#faq" className="hover:text-white">
              FAQ
            </a>
            <Link href="/login" className="hover:text-white">
              Sign in
            </Link>
          </div>
          <p className="text-center text-xs md:text-right">Deforestation screening powered by Whisp (FAO / Forest Data Partnership, MIT licence).</p>
        </div>
      </footer>
    </div>
  );
}
