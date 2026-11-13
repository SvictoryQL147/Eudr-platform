"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { APP_NAME } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

/** Fades a block up into view the first time it scrolls on screen. */
export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) return setShown(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn("transition-all duration-700 ease-out motion-reduce:transition-none", shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0", className)}
    >
      {children}
    </div>
  );
}

const DEADLINE = new Date("2026-12-30T00:00:00+01:00").getTime();

export function Countdown({ compact }: { compact?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, DEADLINE - (now ?? DEADLINE));
  const parts = [
    { v: Math.floor(diff / 864e5), l: "days" },
    { v: Math.floor((diff / 36e5) % 24), l: "hrs" },
    { v: Math.floor((diff / 6e4) % 60), l: "min" },
    { v: Math.floor((diff / 1e3) % 60), l: "sec" },
  ];
  if (now !== null && diff === 0) return <span className="font-semibold">EUDR is now in force for large and medium operators</span>;
  return (
    <div className={cn("flex items-center", compact ? "gap-1.5" : "gap-2 sm:gap-3")} aria-label="Time until 30 December 2026">
      {parts.map((p) => (
        <div
          key={p.l}
          className={cn(
            "flex flex-col items-center rounded-lg border border-white/10 bg-white/5 backdrop-blur",
            compact ? "min-w-[44px] px-1.5 py-1" : "min-w-[64px] px-3 py-2 sm:min-w-[76px]",
          )}
        >
          <span className={cn("font-semibold tabular-nums text-white", compact ? "text-base" : "text-2xl sm:text-3xl")}>{now === null ? "––" : String(p.v).padStart(2, "0")}</span>
          <span className="text-[10px] uppercase tracking-wider text-emerald-200/70">{p.l}</span>
        </div>
      ))}
    </div>
  );
}

const LINKS = [
  ["How it works", "#how"],
  ["Screening", "#screening"],
  ["Evidence pack", "#evidence"],
  ["Pilot", "#pilot"],
  ["FAQ", "#faq"],
];

export function Nav() {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-300", scrolled ? "border-b border-white/10 bg-[#06150f]/80 backdrop-blur-xl" : "bg-transparent")}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-white">
          <Logo />
          <span className="text-[15px] font-semibold tracking-tight">{APP_NAME}</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-emerald-50/70 lg:flex">
          {LINKS.map(([l, h]) => (
            <a key={h} href={h} className="transition hover:text-white">
              {l}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {!loading && user ? (
            <Link href="/dashboard" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-[#06150f] transition hover:bg-emerald-50">
              Open dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link href="/login" className="inline-flex h-9 items-center rounded-full px-4 text-sm font-medium text-white/80 transition hover:text-white">
                Sign in
              </Link>
              <Link href="/register" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-400 px-4 text-sm font-semibold text-[#06150f] shadow-[0_0_24px_rgba(52,211,153,.35)] transition hover:bg-emerald-300">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
        <button className="rounded-md p-2 text-white lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-[#06150f]/95 px-4 pb-5 pt-2 backdrop-blur-xl lg:hidden">
          {LINKS.map(([l, h]) => (
            <a key={h} href={h} onClick={() => setOpen(false)} className="block border-b border-white/5 py-3 text-sm text-emerald-50/80">
              {l}
            </a>
          ))}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href={user ? "/dashboard" : "/login"} className="inline-flex h-10 items-center justify-center rounded-full border border-white/20 text-sm font-medium text-white">
              {user ? "Dashboard" : "Sign in"}
            </Link>
            <Link href="/register" className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-400 text-sm font-semibold text-[#06150f]">
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

/** Score that counts up when it scrolls into view. */
export function CountUp({ to, className }: { to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - start) / 1400);
        setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return (
    <span ref={ref} className={className}>
      {v}
    </span>
  );
}

export function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-stone-200">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-6 py-5 text-left" aria-expanded={open}>
        <span className="text-base font-medium text-stone-900">{q}</span>
        <span className={cn("flex h-7 w-7 flex-none items-center justify-center rounded-full border border-stone-300 text-stone-500 transition-transform", open && "rotate-45")}>+</span>
      </button>
      <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden text-[15px] leading-relaxed text-stone-600">{children}</div>
      </div>
    </div>
  );
}
