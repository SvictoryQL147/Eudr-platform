import type { DocumentType, Role, Severity } from "./types";

export const kg = (n: number | null | undefined) =>
  n == null ? "—" : `${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 1 }).format(n)} kg`;
export const tonnes = (n: number | null | undefined) =>
  n == null ? "—" : `${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2 }).format(n / 1000)} t`;
export const ha = (n: number | null | undefined) =>
  n == null ? "—" : `${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2 }).format(n)} ha`;
export const num = (n: number | null | undefined) => (n == null ? "—" : new Intl.NumberFormat("en-NG").format(n));

export function date(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(+d) ? s : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
export function dateTime(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(+d)
    ? s
    : d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
export const shortId = (id: string | null | undefined) => (id ? id.slice(0, 8).toUpperCase() : "—");

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  farmer_id: "Farmer ID",
  land_title: "Land title / tenure",
  purchase_receipt: "Purchase receipt",
  export_certificate: "Export certificate",
  phytosanitary_certificate: "Phytosanitary certificate",
  other: "Other",
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  compliance_reviewer: "Compliance reviewer",
  field_agent: "Field agent",
  exporter_staff: "Staff",
};

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta",
  "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi",
  "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara",
];

export const EU_COUNTRIES = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czechia", "Denmark", "Estonia", "Finland", "France",
  "Germany", "Greece", "Hungary", "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta",
  "Netherlands", "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden",
];

export const COMMODITIES: { value: string; label: string; hs: string }[] = [
  { value: "cocoa", label: "Cocoa beans", hs: "1801" },
  { value: "cocoa_products", label: "Cocoa paste / butter / powder", hs: "1803" },
  { value: "rubber", label: "Natural rubber", hs: "4001" },
  { value: "palm_oil", label: "Palm oil", hs: "1511" },
  { value: "soya", label: "Soya beans", hs: "1201" },
  { value: "coffee", label: "Coffee", hs: "0901" },
  { value: "wood", label: "Wood", hs: "4403" },
];

/** Human sentence for a rule's entity reference. */
export function entityLink(type: string, id: string): string | null {
  switch (type) {
    case "farm":
      return `/farms/${id}`;
    case "farmer":
      return `/farmers/${id}`;
    case "batch":
      return `/batches#${id}`;
    case "shipment":
      return `/shipments/${id}`;
    case "document":
      return `/documents`;
    case "harvest":
    case "collection_event":
      return `/collections`;
    default:
      return null;
  }
}

import type { Risk } from "./types";
/** Map colour for a plot: by deforestation risk once screened. */
export function riskTone(risk: Risk | null | undefined, valid: boolean | null = true): "ok" | "warn" | "bad" | "none" {
  if (valid === false) return "bad";
  if (risk === "high") return "bad";
  if (risk === "more_info_needed") return "warn";
  if (risk === "low") return "ok";
  return "none";
}
