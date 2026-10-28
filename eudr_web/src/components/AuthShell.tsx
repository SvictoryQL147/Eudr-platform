import { Leaf } from "lucide-react";
import { APP_NAME } from "@/lib/api";

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-900 p-10 text-white lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="rounded-lg bg-white/10 p-1.5">
            <Leaf className="h-5 w-5" />
          </span>
          {APP_NAME}
        </div>
        <div className="max-w-md">
          <p className="text-3xl font-semibold leading-tight">Every bag traced to the farm. Every shipment ready for the EU.</p>
          <p className="mt-4 text-brand-100">
            Map farms, record collections and batches, and see in one score whether a shipment can pass EU deforestation
            rules — with the evidence pack your buyer needs.
          </p>
        </div>
        <p className="text-sm text-brand-200">Built for Nigerian cocoa, rubber and palm oil exporters.</p>
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-brand-700/40" />
      </div>
      <div className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 text-lg font-semibold text-primary lg:hidden">
            <Leaf className="h-5 w-5" /> {APP_NAME}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
