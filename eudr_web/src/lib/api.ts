// Where the backend lives. Empty (the default) = same domain: on Vercel the
// project routes /api/* to FastAPI, and in development next.config.mjs
// proxies /api/* to the local backend on port 8000. Same domain matters:
// the session is an httpOnly cookie, which only flows to our own origin.
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Ala Trace";

// Pages that work without signing in; a 401 there must not bounce to /login.
const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/accept-invite"];

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function describe(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const loc = Array.isArray(d?.loc) ? d.loc.filter((x: unknown) => x !== "body").join(" › ") : "";
        return loc ? `${loc}: ${d?.msg}` : d?.msg;
      })
      .join("; ");
  }
  return "Something went wrong";
}

type Opts = { method?: string; body?: unknown; form?: FormData; raw?: boolean };

export async function api<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  // Custom header = CSRF protection (browsers never add it to cross-site forms).
  const headers: Record<string, string> = { "X-Requested-With": "ala" };
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method || (body ? "POST" : "GET"),
      headers,
      body,
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }
  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/v1/auth/")) {
    if (!PUBLIC_PATHS.includes(window.location.pathname)) {
      window.location.href = `/login?expired=1&next=${encodeURIComponent(window.location.pathname)}`;
    }
  }
  if (!res.ok) {
    let detail: unknown = res.statusText;
    try {
      detail = (await res.json()).detail;
    } catch {
      /* not json */
    }
    throw new ApiError(res.status, describe(detail));
  }
  // Any successful change (POST/PATCH/DELETE) refreshes every screen's data.
  const method = (opts.method || (body ? "POST" : "GET")).toUpperCase();
  if (method !== "GET") {
    import("./query").then(({ queryClient }) => queryClient.invalidateQueries());
  }
  if (opts.raw) return res as unknown as T;
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Downloads a stored document: a signed storage link when files live in
 *  S3/R2, otherwise streamed through the API. */
export async function downloadDocument(id: string, fallbackName: string) {
  const link = await api<{ url: string | null; filename: string }>(`/api/v1/documents/${id}/link`);
  if (link.url) {
    window.location.assign(link.url);
    return;
  }
  await downloadFile(`/api/v1/documents/${id}/file`, link.filename || fallbackName);
}

/** Fetches an authenticated file and hands it to the browser as a download. */
export async function downloadFile(path: string, fallbackName: string) {
  const res = await api<Response>(path, { raw: true });
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const match = /filename="?([^";]+)"?/i.exec(cd);
  const name = match?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadJson(data: unknown, name: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
