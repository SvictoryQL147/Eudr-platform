# EUDR web dashboard

The exporter-facing web app for `eudr_core`. Next.js 14 + TypeScript +
Tailwind, shadcn/ui-style components on Radix UI, TanStack Query (data
caching) and TanStack Table (data tables), Leaflet maps (OpenStreetMap and
Esri satellite), sonner toasts and a cmdk command palette (Ctrl+K).

## Pages

| Page | What it does |
|---|---|
| Sign in / Create account | Each exporter gets its own company space |
| Overview | Days to the EUDR deadline, mapped-farm %, cocoa collected, ready / blocked shipments, most common problems, map of all plots, setup checklist |
| Farmers | Register and search farmers; ID status; per-farmer farms and documents (ID card, land title) |
| Deforestation screening | Screen plots with Whisp from a farm, the Farms page or a shipment; results colour the maps, feed the readiness score and appear in the evidence pack |
| Farms & maps | Satellite map of every plot; add a farm by **clicking the boundary on the map**, **pasting coordinates / GeoJSON**, or **walking it with a phone** ("Add my GPS point" at each corner) |
| Harvests & collections | What farmers report vs what agents weigh; shows kilos not yet batched |
| Batches | Pick collections (or part of one) into a lot; warns when output differs from inputs by more than 5% |
| Shipments | Readiness score from the 20 rules, every problem with its fix and a link to the record to fix, batches, export certificate upload, readiness history |
| Evidence pack | Printable pack for the EU buyer (save as PDF) + GeoJSON of plots + JSON with a SHA-256 integrity hash |
| Documents | Every document, expiry warnings, downloads |
| Team | Staff logins and field agents |

## Run it (Windows, Git Bash)

Start the backend first (see `../START_HERE.md`), then:

```bash
cd eudr_web
cp env.local.example .env.local   # optional: defaults already point at http://127.0.0.1:8000
npm install
npm run dev
```

Open http://localhost:3000.

For a production build: `npm run build && npm start`.

## Code layout

- `src/components/ui/`: shadcn/ui-style primitives (button, dialog, dropdown, tabs, table, command, ...). Copied source, so edit freely.
- `src/components/kit.tsx`: app-level pieces built from them (PageHeader, Stat, Modal, badges, ScoreRing).
- `src/components/DataTable.tsx`: TanStack Table with search, sorting, column picker, CSV export and paging.
- `src/lib/useApi.ts`: data loading through TanStack Query; any change refreshes every screen.
- Theme colours live as CSS variables in `src/app/globals.css`.

## Settings (`.env.local`)

- `NEXT_PUBLIC_API_URL`: where the backend runs.
- `NEXT_PUBLIC_APP_NAME`: the product name shown everywhere (currently "EUDR Ready", a placeholder until you pick a brand).
