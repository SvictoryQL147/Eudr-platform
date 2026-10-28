export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "EUDR Ready";

const TOKEN_KEY = "eudr.token";

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — session lasts until reload */
  }
}

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
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method: opts.method || (body ? "POST" : "GET"), headers, body });
  } catch {
    throw new ApiError(0, `Can't reach the server at ${API_URL}. Is the backend running?`);
  }
  if (res.status === 401 && token) {
    setToken(null);
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login?expired=1";
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
