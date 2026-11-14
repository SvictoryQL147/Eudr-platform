"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Headline that assembles word by word (blur → sharp), Framer-style. */
export function WordReveal({ text, className, start = 0, gradientFrom }: { text: string; className?: string; start?: number; gradientFrom?: number }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span
          key={i}
          className={cn(
            "inline-block animate-blur-in pr-[0.22em] motion-reduce:animate-none",
            gradientFrom !== undefined && i >= gradientFrom && "bg-gradient-to-r from-emerald-300 via-lime-200 to-emerald-400 bg-clip-text text-transparent",
          )}
          style={{ animationDelay: `${start + i * 70}ms` }}
        >
          {w}
        </span>
      ))}
    </span>
  );
}

/** Card whose border and surface light up under the cursor. */
export function Spotlight({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        ref.current!.style.setProperty("--x", `${e.clientX - r.left}px`);
        ref.current!.style.setProperty("--y", `${e.clientY - r.top}px`);
      }}
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] transition-colors duration-300 hover:border-white/[0.16]",
        "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100",
        "before:[background:radial-gradient(420px_circle_at_var(--x)_var(--y),rgba(52,211,153,.13),transparent_45%)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Tilts the product shot back in 3D and flattens it as you scroll. */
export function ScrollTilt({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setK(1);
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        setK(Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.85))));
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, []);
  const rx = 28 * (1 - k);
  const sc = 0.88 + 0.12 * k;
  return (
    <div ref={ref} className={cn("[perspective:1600px]", className)}>
      <div style={{ transform: `rotateX(${rx}deg) scale(${sc})`, transformOrigin: "50% 0%" }} className="will-change-transform transition-transform duration-100 ease-out">
        {children}
      </div>
    </div>
  );
}

/** Infinite horizontal ticker. */
export function Marquee({ items, className }: { items: React.ReactNode[]; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]", className)}>
      <div className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused] motion-reduce:animate-none">
        {[...items, ...items].map((it, i) => (
          <div key={i} className="flex-none">
            {it}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Sticky "how it works": the left panel follows whichever step is on screen. */
export function StickySteps({ steps }: { steps: { n: string; t: string; b: string; visual: React.ReactNode }[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="hidden lg:block">
        <div className="sticky top-28">
          <div className="relative aspect-[5/4] overflow-hidden rounded-3xl border border-white/10 bg-[#071a12] shadow-[0_40px_100px_-30px_rgba(0,0,0,.7)]">
            {steps.map((s, i) => (
              <div key={s.n} className={cn("absolute inset-0 transition-all duration-700", i === active ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0")}>
                {s.visual}
              </div>
            ))}
          </div>
          <div className="mt-5 flex gap-2">
            {steps.map((s, i) => (
              <span key={s.n} className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <span className={cn("block h-full rounded-full bg-emerald-400 transition-all duration-700", i <= active ? "w-full" : "w-0")} />
              </span>
            ))}
          </div>
        </div>
      </div>
      <div>
        {steps.map((s, i) => (
          <div
            key={s.n}
            ref={(el) => {
              refs.current[i] = el;
            }}
            data-i={i}
            className="flex min-h-[55vh] flex-col justify-center py-8 lg:min-h-[70vh]"
          >
            <div className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-[#071a12] lg:hidden">
              <div className="relative aspect-[5/4]">{s.visual}</div>
            </div>
            <span className={cn("font-display text-sm font-bold tracking-[0.2em] transition-colors duration-500", i === active ? "text-emerald-300" : "text-white/30")}>
              STEP {s.n}
            </span>
            <h3 className={cn("mt-3 font-display text-3xl font-bold tracking-tight transition-colors duration-500 sm:text-4xl", i === active ? "text-white" : "text-white/40")}>{s.t}</h3>
            <p className={cn("mt-4 max-w-md text-lg leading-relaxed transition-colors duration-500", i === active ? "text-white/65" : "text-white/30")}>{s.b}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Number that counts up once visible. */
export function Counter({ to, suffix = "", prefix = "", className }: { to: number; suffix?: string; prefix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / 1600);
        setV(Math.round(to * (1 - Math.pow(1 - k, 4))));
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
      {prefix}
      {v.toLocaleString()}
      {suffix}
    </span>
  );
}
