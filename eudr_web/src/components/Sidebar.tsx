"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Boxes, ChevronsUpDown, FileText, Gauge, Leaf, LogOut, Map, Menu, Scale, Search, Ship, Users, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { APP_NAME } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { SheetContent } from "./ui/dialog";

export const NAV = [
  { group: "Overview", items: [{ href: "/dashboard", label: "Overview", icon: Gauge }] },
  {
    group: "Supply",
    items: [
      { href: "/farmers", label: "Farmers", icon: UsersRound },
      { href: "/farms", label: "Farms & maps", icon: Map },
      { href: "/collections", label: "Harvests & collections", icon: Scale },
    ],
  },
  {
    group: "Export",
    items: [
      { href: "/batches", label: "Batches", icon: Boxes },
      { href: "/shipments", label: "Shipments", icon: Ship },
      { href: "/documents", label: "Documents", icon: FileText },
    ],
  },
  { group: "Organisation", items: [{ href: "/team", label: "Team", icon: Users }] },
];

function initials(name?: string | null) {
  return (name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-5">
      {NAV.map((g) => (
        <div key={g.group}>
          <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-sidebar-muted">{g.group}</p>
          <div className="space-y-0.5">
            {g.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-sidebar-accent text-white" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white",
                  )}
                >
                  {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-emerald-400" />}
                  <Icon className={cn("h-4 w-4 flex-none", active ? "text-emerald-300" : "text-sidebar-muted group-hover:text-sidebar-foreground")} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-700 text-white shadow-inner">
        <Leaf className="h-4 w-4" />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-white">{APP_NAME}</p>
        <p className="text-[11px] text-sidebar-muted">EUDR compliance</p>
      </div>
    </div>
  );
}

function UserMenu() {
  const { user, organization, logout } = useAuth();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg border border-sidebar-border p-2 text-left transition hover:bg-sidebar-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-emerald-800 text-xs font-semibold text-emerald-100">{initials(user?.name)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">{organization?.name}</span>
          <span className="block truncate text-xs text-sidebar-muted">{user?.name}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 text-sidebar-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-60">
        <DropdownMenuLabel>
          <span className="block text-sm font-medium text-foreground">{user?.name}</span>
          <span className="block font-normal">{user?.email}</span>
          <span className="block font-normal">{user ? ROLE_LABELS[user.role] : ""}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/team">
            <Users /> Team
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={logout}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SearchTrigger({ onOpen, className }: { onOpen: () => void; className?: string }) {
  return (
    <button
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-sm text-sidebar-muted transition hover:text-sidebar-foreground",
        className,
      )}
    >
      <Search className="h-4 w-4" /> Search…
      <kbd className="ml-auto rounded border border-sidebar-border px-1.5 text-[10px] font-medium">Ctrl K</kbd>
    </button>
  );
}

export default function Sidebar({ onSearch }: { onSearch: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar px-3 py-4 lg:flex">
        <Brand />
        <div className="mt-5 px-1">
          <SearchTrigger onOpen={onSearch} />
        </div>
        <div className="mt-5 flex-1 overflow-y-auto px-1">
          <NavLinks />
        </div>
        <UserMenu />
      </aside>

      <header className="no-print sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 lg:hidden">
        <Brand />
        <div className="flex items-center gap-1">
          <button onClick={onSearch} className="rounded-md p-2 text-sidebar-foreground hover:bg-sidebar-accent" aria-label="Search">
            <Search className="h-5 w-5" />
          </button>
          <button onClick={() => setOpen(true)} className="rounded-md p-2 text-sidebar-foreground hover:bg-sidebar-accent" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <SheetContent className="flex flex-col bg-sidebar px-3 py-4">
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <Dialog.Description className="sr-only">Navigation</Dialog.Description>
          <Brand />
          <div className="mt-5 flex-1 overflow-y-auto px-1">
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
          <UserMenu />
        </SheetContent>
      </Dialog.Root>
    </>
  );
}
