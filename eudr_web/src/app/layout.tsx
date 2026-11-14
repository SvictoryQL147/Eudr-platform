import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";

const APP = process.env.NEXT_PUBLIC_APP_NAME || "Ala Trace";

export const metadata: Metadata = {
  title: { default: `${APP} · EUDR traceability for African exporters`, template: `%s · ${APP}` },
  description:
    "Map every farm, screen every plot for deforestation, and know before you ship whether a cocoa, rubber or palm oil consignment will pass the EU Deforestation Regulation.",
  applicationName: APP,
  openGraph: {
    title: `${APP} · EUDR traceability for African exporters`,
    description: "Farm-to-port traceability, deforestation screening and shipment readiness for the EUDR.",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#0a3d2b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
