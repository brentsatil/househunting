export type PropertySource = "domain" | "rea" | "facebook" | "manual";

export type PropertyStatus =
  | "interested"
  | "inspection_booked"
  | "inspected"
  | "applied"
  | "offer_made"
  | "passed"
  | "won"
  | "lost";

export type PropertyType =
  | "house"
  | "apartment"
  | "townhouse"
  | "villa"
  | "unit"
  | "studio"
  | "duplex"
  | "land"
  | "other";

export type PetPolicy = "allowed" | "not_allowed" | "negotiable";

export type AustralianState =
  | "NSW"
  | "VIC"
  | "QLD"
  | "WA"
  | "SA"
  | "TAS"
  | "ACT"
  | "NT";

export type SearchMode = "rent" | "buy";

export interface Property {
  id: string;
  partnership_id: string;

  // Source
  source: PropertySource;
  source_url: string | null;
  external_id: string | null;

  // Location
  address: string;
  suburb: string;
  postcode: string;
  state: AustralianState;
  lat: number | null;
  lng: number | null;

  // Details
  property_type: PropertyType | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  land_size_sqm: number | null;
  building_size_sqm: number | null;

  // Pricing (rental) - stored in cents
  rent_weekly: number | null;
  bond: number | null;

  // Pricing (buying) - stored in cents
  sale_price: number | null;
  price_guide: string | null;
  auction_date: string | null;
  strata_fees_quarterly: number | null;
  council_rates_annual: number | null;

  // Content
  description: string | null;
  images: string[];
  floor_plan_url: string | null;
  virtual_tour_url: string | null;

  // Agent
  agent_name: string | null;
  agent_agency: string | null;
  agent_phone: string | null;
  agent_email: string | null;

  // Lease/rental specifics
  lease_length: string | null;
  available_date: string | null;
  pet_policy: PetPolicy | null;
  furnished: boolean;

  // Buying specifics
  cooling_off_days: number | null;

  // Status
  status: PropertyStatus;

  // AI-generated
  ai_summary: string | null;
  ai_red_flags: {
    flags: Array<{
      severity: "info" | "warning" | "critical";
      category: string;
      title: string;
      explanation: string;
    }>;
    overall_risk: "low" | "medium" | "high";
  } | null;
  ai_alignment: {
    together_score: number;
    agreements: string[];
    disagreements: string[];
    compromise_suggestions: string[];
    verdict: string;
  } | null;

  listed_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExtractedProperty {
  source: PropertySource;
  source_url: string;
  external_id?: string;
  address?: string;
  suburb?: string;
  postcode?: string;
  state?: AustralianState;
  lat?: number;
  lng?: number;
  property_type?: PropertyType;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  land_size_sqm?: number;
  building_size_sqm?: number;
  rent_weekly?: number;
  bond?: number;
  sale_price?: number;
  price_guide?: string;
  auction_date?: string;
  strata_fees_quarterly?: number;
  council_rates_annual?: number;
  description?: string;
  images?: string[];
  floor_plan_url?: string;
  virtual_tour_url?: string;
  agent_name?: string;
  agent_agency?: string;
  agent_phone?: string;
  agent_email?: string;
  lease_length?: string;
  available_date?: string;
  pet_policy?: PetPolicy;
  furnished?: boolean;
  cooling_off_days?: number;
  listed_date?: string;
  inspection_times?: Array<{
    date: string;
    start_time: string;
    end_time?: string;
  }>;
  /** Fields that couldn't be extracted and need manual entry */
  missing_fields?: string[];
}

export interface PropertyInteraction {
  id: string;
  property_id: string;
  user_id: string;
  rating: number | null;
  pros: string | null;
  cons: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyWithInteractions extends Property {
  interactions: PropertyInteraction[];
  comments: Comment[];
  inspections: Inspection[];
  enrichment: EnrichmentData | null;
}

export interface Comment {
  id: string;
  property_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface Inspection {
  id: string;
  property_id: string;
  datetime: string;
  attendees: string[];
  notes: string | null;
  post_inspection_notes: string | null;
  created_at: string;
}

export interface EnrichmentData {
  id: string;
  property_id: string;
  suburb_stats: SuburbStats | null;
  council_zoning: CouncilZoning | null;
  comparables: Comparable[] | null;
  fetched_at: string;
}

export interface SuburbStats {
  walk_score?: number;
  transit_score?: number;
  median_rent_weekly?: number;
  median_sale_price?: number;
  population?: number;
  nearby_schools?: Array<{
    name: string;
    type: string;
    distance_km: number;
  }>;
  nearby_transport?: Array<{
    name: string;
    type: string;
    distance_km: number;
  }>;
}

export interface CouncilZoning {
  zone_code?: string;
  zone_description?: string;
  heritage_overlay?: boolean;
  heritage_details?: string;
  flood_zone?: boolean;
  flood_zone_details?: string;
  bushfire_prone?: boolean;
  local_government_area?: string;
}

export interface Comparable {
  address: string;
  price: number;
  price_period?: string;
  bedrooms: number;
  bathrooms: number;
  property_type: string;
  distance_km: number;
  listed_date?: string;
  source_url?: string;
}
