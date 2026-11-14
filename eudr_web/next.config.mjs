/** @type {import('next').NextConfig} */

// Local development: proxy API calls to the FastAPI backend so the browser
// sees one origin (the session cookie is httpOnly and same-site). On
// Vercel, vercel.json routes these paths to the backend service instead.
const API_PROXY_URL = (process.env.API_PROXY_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const proxied = ["/api/:path*", "/health", "/health/ready", "/docs", "/openapi.json"];

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      // map tiles (OpenStreetMap, Esri satellite) and signed document links (S3/R2)
      "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://server.arcgisonline.com https://unpkg.com",
      "connect-src 'self' https://*.ingest.sentry.io https://*.ingest.de.sentry.io",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    if (process.env.VERCEL) return [];
    return proxied.map((source) => ({ source, destination: `${API_PROXY_URL}${source}` }));
  },
};
export default nextConfig;
