import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "EUDR Ready",
  description: "EUDR traceability, deforestation screening and shipment readiness for Nigerian commodity exporters",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
