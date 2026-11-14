import { cn } from "@/lib/utils";

/**
 * Ala Trace mark: an "A" drawn as a mapped farm plot. The three corners are
 * GPS vertices, the dashed crossbar is the traced path from farm to port,
 * and the bright apex is the shipment that passes. ("Ala" is the Igbo word
 * for land.)
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const id = `ala-g-${size}`;
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={cn("flex-none", className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1fbf6a" />
          <stop offset="0.55" stopColor="#0f7a46" />
          <stop offset="1" stopColor="#0a3d2b" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill="none" stroke="white" strokeOpacity=".14" />
      <path d="M8 24 16 7.5 24 24" fill="none" stroke="white" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M11.2 18.2h9.6" stroke="#c7f5a6" strokeWidth="2" strokeLinecap="round" strokeDasharray="2.2 2.4" />
      <circle cx="8" cy="24" r="2.1" fill="white" />
      <circle cx="24" cy="24" r="2.1" fill="white" />
      <circle cx="16" cy="7.5" r="2.6" fill="#c7f5a6" stroke="#0a3d2b" strokeWidth="1" />
    </svg>
  );
}

export function Logo({
  size = 32,
  tone = "dark",
  sub,
  className,
}: {
  size?: number;
  tone?: "dark" | "light";
  sub?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className="leading-none">
        <span
          className={cn(
            "block font-display font-bold tracking-tight",
            tone === "light" ? "text-white" : "text-foreground",
          )}
          style={{ fontSize: size * 0.53 }}
        >
          Ala<span className={tone === "light" ? "text-emerald-300" : "text-emerald-600"}> Trace</span>
        </span>
        {sub && (
          <span className={cn("mt-1 block text-[11px] font-medium", tone === "light" ? "text-white/55" : "text-muted-foreground")}>{sub}</span>
        )}
      </span>
    </span>
  );
}
