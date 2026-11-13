export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="relative inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-300 via-emerald-500 to-emerald-800 shadow-[0_0_20px_rgba(16,185,129,.35)]" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 19c9 0 14-6 14-14-8 0-14 5-14 14Z" />
        <path d="M5 19 13 11" />
        <circle cx="16.5" cy="16.5" r="2.2" fill="white" stroke="none" />
      </svg>
    </span>
  );
}
