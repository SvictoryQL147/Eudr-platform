"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Map, Plus, Ship, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Farm, Farmer, Shipment } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { NAV } from "./Sidebar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";

/** Ctrl/⌘+K: jump to any page, farmer, farm or shipment. */
export default function CommandMenu({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const router = useRouter();
  const farmers = useApi<Farmer[]>(open ? "/api/v1/farmers" : null);
  const farms = useApi<Farm[]>(open ? "/api/v1/farms" : null);
  const shipments = useApi<Shipment[]>(open ? "/api/v1/shipments" : null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-[12vh] z-[1001] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border bg-popover shadow-pop data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <Dialog.Description className="sr-only">Search pages, farmers, farms and shipments</Dialog.Description>
          <Command>
            <CommandInput placeholder="Search farmers, farms, shipments or pages…" autoFocus />
            <CommandList>
              <CommandEmpty>No results.</CommandEmpty>
              <CommandGroup heading="Quick actions">
                <CommandItem onSelect={() => go("/farmers?new=1")}>
                  <Plus /> Register farmer
                </CommandItem>
                <CommandItem onSelect={() => go("/farms?new=1")}>
                  <Plus /> Add farm
                </CommandItem>
                <CommandItem onSelect={() => go("/shipments?new=1")}>
                  <Plus /> New shipment
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading="Pages">
                {NAV.flatMap((g) => g.items).map(({ href, label, icon: Icon }) => (
                  <CommandItem key={href} value={`page ${label}`} onSelect={() => go(href)}>
                    <Icon /> {label}
                  </CommandItem>
                ))}
              </CommandGroup>
              {!!shipments.data?.length && (
                <CommandGroup heading="Shipments">
                  {shipments.data.slice(0, 50).map((s) => (
                    <CommandItem key={s.id} value={`shipment ${s.reference} ${s.buyer_name} ${s.destination_country}`} onSelect={() => go(`/shipments/${s.id}`)}>
                      <Ship /> {s.reference || s.id.slice(0, 8)}
                      <span className="ml-auto truncate text-xs text-muted-foreground">{s.buyer_name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {!!farmers.data?.length && (
                <CommandGroup heading="Farmers">
                  {farmers.data.slice(0, 200).map((f) => (
                    <CommandItem key={f.id} value={`farmer ${f.full_name} ${f.community} ${f.state} ${f.phone_number}`} onSelect={() => go(`/farmers/${f.id}`)}>
                      <UserRound /> {f.full_name}
                      <span className="ml-auto truncate text-xs text-muted-foreground">{[f.community, f.state].filter(Boolean).join(", ")}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {!!farms.data?.length && (
                <CommandGroup heading="Farms">
                  {farms.data.slice(0, 200).map((f) => (
                    <CommandItem key={f.id} value={`farm ${f.name} ${f.farmer_name}`} onSelect={() => go(`/farms/${f.id}`)}>
                      <Map /> {f.name || f.id.slice(0, 8)}
                      <span className="ml-auto truncate text-xs text-muted-foreground">{f.farmer_name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
