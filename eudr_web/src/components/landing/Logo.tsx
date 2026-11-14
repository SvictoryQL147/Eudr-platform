import { LogoMark } from "@/components/brand/Logo";

export function Logo({ size = 32 }: { size?: number }) {
  return <LogoMark size={size} className="drop-shadow-[0_0_18px_rgba(16,185,129,.35)]" />;
}
