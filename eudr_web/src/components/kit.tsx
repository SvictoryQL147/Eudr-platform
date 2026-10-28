"use client";

/**
 * App-level building blocks composed from the shadcn/ui primitives in
 * ./ui. Pages import from here so the whole product shares one look.
 */
import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import type { Severity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge as UiBadge } from "./ui/badge";
import { Button as UiButton, buttonVariants } from "./ui/button";
import { Card as UiCard } from "./ui/card";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input as UiInput, NativeSelect, Textarea as UiTextarea } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import { Table as UiTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

export const cx = cn;

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
const VARIANT: Record<Variant, "default" | "outline" | "ghost" | "destructive"> = {
  primary: "default",
  secondary: "outline",
  outline: "outline",
  ghost: "ghost",
  danger: "destructive",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  children,
  ...rest
}: Omit<React.ComponentProps<typeof UiButton>, "variant" | "size"> & { variant?: Variant; size?: "sm" | "md" | "icon"; icon?: React.ReactNode }) {
  return (
    <UiButton variant={VARIANT[variant]} size={size === "md" ? "default" : size} {...rest}>
      {!rest.loading && icon}
      {children}
    </UiButton>
  );
}

export function LinkButton({ href, children, variant = "secondary", icon, size = "md" }: { href: string; children: React.ReactNode; variant?: Variant; icon?: React.ReactNode; size?: "sm" | "md" }) {
  return (
    <Link href={href} className={buttonVariants({ variant: VARIANT[variant], size: size === "md" ? "default" : "sm" })}>
      {icon}
      {children}
    </Link>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <UiCard className={cn("animate-fade-up", className)}>{children}</UiCard>;
}

export function CardHeader({ title, subtitle, action, icon }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="mt-0.5 rounded-md bg-accent p-1.5 text-accent-foreground [&_svg]:size-4">{icon}</div>}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, back, badge }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string }; badge?: React.ReactNode }) {
  return (
    <div className="mb-6 animate-fade-up">
      {back && (
        <Link href={back.href} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, error, children, required }: { label: string; hint?: string; error?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="block text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </label>
  );
}

export const Input = UiInput;
export const Textarea = UiTextarea;
export const Select = NativeSelect;

type Tone = "stone" | "green" | "red" | "amber" | "blue" | "orange" | "violet";
export function Badge({ tone = "stone", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <UiBadge tone={tone === "stone" ? "neutral" : tone} className={className}>
      {children}
    </UiBadge>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const tone = ({ critical: "red", high: "orange", medium: "amber", low: "stone" } as const)[severity];
  return <Badge tone={tone}>{severity[0].toUpperCase() + severity.slice(1)}</Badge>;
}

export function StatusBadge({ score, blocked }: { score: number | null; blocked: boolean | null }) {
  if (score == null) return <Badge>Not assessed</Badge>;
  if (blocked)
    return (
      <Badge tone="red">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Blocked
      </Badge>
    );
  if (score >= 90)
    return (
      <Badge tone="green">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ready
      </Badge>
    );
  return (
    <Badge tone="amber">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Needs work
    </Badge>
  );
}

export function Modal({ open, onClose, title, description, children, wide }: { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent wide={wide} onPointerDownOutside={(e) => {
        // Leaflet maps inside dialogs: don't close when dragging the map.
        if ((e.target as HTMLElement)?.closest?.(".leaflet-container")) e.preventDefault();
      }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export function ErrorBox({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
      <span>{message}</span>
    </div>
  );
}

export function Loading({ rows = 5 }: { label?: string; rows?: number }) {
  return (
    <div className="space-y-3 p-5" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

export function Empty({ icon, title, body, action }: { icon?: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-3 rounded-full bg-accent p-3 text-accent-foreground [&_svg]:size-5">{icon}</div>}
      <p className="font-medium">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Simple static table (for small lists). Use DataTable for big ones. */
export function Table({ head, children }: { head: React.ReactNode[]; children: React.ReactNode }) {
  return (
    <UiTable>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {head.map((h, i) => (
            <TableHead key={i}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </UiTable>
  );
}
export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <TableCell className={className}>{children}</TableCell>;
}
export { TableRow as Tr };

export function Stat({ label, value, sub, tone, icon }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "red" | "green" | "amber"; icon?: React.ReactNode }) {
  return (
    <UiCard className="animate-fade-up px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>}
      </div>
      <p
        className={cn(
          "mt-1.5 text-2xl font-semibold tabular-nums tracking-tight",
          tone === "red" ? "text-red-700" : tone === "green" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-foreground",
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </UiCard>
  );
}

export function ScoreRing({ score, blocked, size = 120 }: { score: number | null; blocked?: boolean | null; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const color = score == null ? "#d6d3d1" : blocked ? "#dc2626" : score >= 90 ? "#15803d" : "#d97706";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--secondary))" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums">{score ?? "—"}</span>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">of 100</span>
      </div>
    </div>
  );
}
