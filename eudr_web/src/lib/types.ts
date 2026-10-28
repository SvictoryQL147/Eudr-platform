export type Role = "admin" | "compliance_reviewer" | "field_agent" | "exporter_staff";

export interface User {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at?: string;
}
export interface Organization { id: string; name: string }
export interface Session { access_token: string; user: User; organization: Organization }

export interface Farmer {
  id: string;
  full_name: string;
  phone_number: string | null;
  national_id_number: string | null;
  community: string | null;
  state: string | null;
  created_at?: string;
  farm_count: number;
  mapped_farm_count: number;
  total_hectares: number;
}

export type Ring = [number, number][]; // [lon, lat]

export interface Farm {
  id: string;
  farmer_id: string | null;
  farmer_name: string | null;
  name: string | null;
  area_hectares: number | null;
  has_geolocation: boolean;
  polygon_ring: Ring | null;
  centroid: [number, number] | null;
  polygon_is_valid: boolean | null;
  harvested_kg: number;
  collected_kg: number;
  created_at?: string;
  deforestation_risk: Risk | null;
  screening_provider: string | null;
  screened_at: string | null;
  screening_indicators: Record<string, string | null> | null;
  screening_outdated: boolean;
}

export type Risk = "low" | "high" | "more_info_needed";

export interface ScreeningStatus { enabled: boolean; provider: string; demo: boolean; message: string | null }
export interface ScreeningJob {
  id: string;
  status: "queued" | "running" | "done" | "failed";
  provider: string;
  farm_count: number;
  done_count: number;
  error: string | null;
  created_at: string | null;
  finished_at: string | null;
}
export interface ScreeningHistoryItem {
  id: string;
  provider: string;
  risk: Risk;
  indicators: Record<string, string | null> | null;
  commodity: string;
  screened_at: string | null;
  current_boundary: boolean;
}

export interface Harvest {
  id: string;
  farm_id: string;
  farm_name: string | null;
  farmer_name: string | null;
  harvest_date: string | null;
  quantity_kg: number;
  created_at?: string;
}

export interface CollectionEvent {
  id: string;
  farm_id: string;
  farm_name: string | null;
  farmer_name: string | null;
  agent_user_id: string | null;
  agent_name: string | null;
  weight_kg: number;
  quality_grade: string | null;
  location_recorded: boolean;
  collected_at: string | null;
  created_at?: string;
  batched_kg: number;
  available_kg: number;
}

export interface BatchInput {
  collection_event_id: string;
  quantity_kg: number;
  farm_id: string | null;
  farm_name: string | null;
  farmer_name: string | null;
}
export interface Batch {
  id: string;
  output_kg: number;
  created_at?: string;
  input_total_kg: number;
  input_count: number;
  farm_count: number;
  shipment_ids: string[];
  inputs: BatchInput[];
}

export interface Shipment {
  id: string;
  reference: string | null;
  destination_country: string | null;
  buyer_name: string | null;
  commodity: string | null;
  hs_code: string | null;
  created_at?: string;
  batch_count: number;
  net_mass_kg: number;
  latest_score: number | null;
  is_blocked: boolean | null;
  last_assessed_at: string | null;
  open_findings: number;
}

export type Severity = "critical" | "high" | "medium" | "low";
export interface Finding {
  rule_id: string;
  severity: Severity;
  title: string;
  message: string;
  remediation: string;
  entity_type: string;
  entity_id: string;
}
export interface Readiness {
  shipment_id: string;
  score: number;
  is_blocked: boolean;
  computed_at: string;
  findings: Finding[];
}
export interface AssessmentSummary { id: string; score: number; is_blocked: boolean; computed_at: string; finding_count: number }

export type DocumentType =
  | "farmer_id"
  | "land_title"
  | "purchase_receipt"
  | "export_certificate"
  | "phytosanitary_certificate"
  | "other";
export type LinkedType = "farmer" | "batch" | "shipment";

export interface DocumentItem {
  id: string;
  document_type: DocumentType;
  linked_to_type: LinkedType;
  linked_to_id: string;
  expiry_date: string | null;
  original_filename: string | null;
  content_type: string | null;
  size_bytes: number | null;
  uploaded_at: string | null;
  has_file: boolean;
}

export interface DashboardSummary {
  organization_name: string;
  farmers: number;
  farms: number;
  mapped_farms: number;
  mapped_pct: number;
  total_hectares: number;
  collected_kg: number;
  shipments: number;
  shipments_ready: number;
  shipments_blocked: number;
  shipments_not_assessed: number;
  average_score: number | null;
  top_issues: { rule_id: string; title: string; severity: Severity; shipments: number }[];
  deforestation: { low: number; more_info_needed: number; high: number; not_screened: number };
  eudr_deadline: string;
  days_to_deadline: number;
}

export interface EvidencePack {
  pack_version: string;
  generated_at: string;
  content_sha256: string;
  exporter: { organization_id: string; name: string } | null;
  shipment: {
    id: string;
    reference: string | null;
    commodity: string;
    hs_code: string;
    net_mass_kg: number;
    country_of_production: string;
    destination_country: string | null;
    buyer_name: string | null;
    created_at: string | null;
  };
  dds_support: {
    note: string;
    hs_code: string;
    description: string;
    net_mass_kg: number;
    countries_of_production: string[];
    plot_count: number;
    mapped_plot_count: number;
    total_area_ha: number;
  };
  geolocation: {
    type: "FeatureCollection";
    features: {
      type: "Feature";
      geometry: { type: "Polygon"; coordinates: number[][][] };
      properties: Record<string, string | number | null>;
    }[];
  };
  unmapped_plots: { farm_id: string; farm_name: string | null; farmer: string | null }[];
  chain_of_custody: {
    batch_id: string;
    batch_output_kg: number;
    inputs: {
      collection_event_id: string;
      quantity_kg: number;
      collected_at: string | null;
      location_recorded: boolean | null;
      farm_id: string | null;
      farm_name: string | null;
      farmer: string | null;
    }[];
  }[];
  producers: {
    farmer_id: string;
    name: string;
    community: string | null;
    state: string | null;
    has_national_id: boolean;
    farm_id: string;
    farm_area_ha: number | null;
    kg_in_shipment: number;
  }[];
  documents: { id: string; type: string; linked_to: string; filename: string | null; expiry_date: string | null; uploaded_at: string | null }[];
  compliance_assessment: {
    assessment_id: string;
    readiness_score: number;
    is_blocked: boolean;
    computed_at: string;
    rules_engine: string;
    findings: { rule_id: string; severity: Severity; title: string; message: string; remediation: string }[];
  } | null;
  deforestation_screening: {
    status: "performed" | "partial" | "not_performed";
    is_demo: boolean;
    method: string | null;
    providers: string[];
    cutoff_date: string;
    note: string;
    summary: { plots_mapped: number; plots_screened: number; low: number; more_info_needed: number; high: number };
    plots: {
      farm_id: string;
      farm_name: string | null;
      farmer: string | null;
      risk: Risk | null;
      indicators: Record<string, string | null> | null;
      provider: string | null;
      screened_at: string | null;
    }[];
  };
}
