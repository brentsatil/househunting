import type { AustralianState, PropertyStatus, PropertyType, PetPolicy } from "@/types/property";

export const AUSTRALIAN_STATES: { value: AustralianState; label: string }[] = [
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "WA", label: "Western Australia" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NT", label: "Northern Territory" },
];

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "townhouse", label: "Townhouse" },
  { value: "villa", label: "Villa" },
  { value: "unit", label: "Unit" },
  { value: "studio", label: "Studio" },
  { value: "duplex", label: "Duplex" },
  { value: "land", label: "Land" },
  { value: "other", label: "Other" },
];

export const PROPERTY_STATUSES: { value: PropertyStatus; label: string; color: string }[] = [
  { value: "interested", label: "Interested", color: "bg-blue-100 text-blue-800" },
  { value: "inspection_booked", label: "Inspection Booked", color: "bg-amber-100 text-amber-800" },
  { value: "inspected", label: "Inspected", color: "bg-cyan-100 text-cyan-800" },
  { value: "applied", label: "Applied", color: "bg-purple-100 text-purple-800" },
  { value: "offer_made", label: "Offer Made", color: "bg-orange-100 text-orange-800" },
  { value: "passed", label: "Passed", color: "bg-gray-100 text-gray-800" },
  { value: "won", label: "Won", color: "bg-green-100 text-green-800" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-800" },
];

export const PET_POLICIES: { value: PetPolicy; label: string }[] = [
  { value: "allowed", label: "Pets Allowed" },
  { value: "not_allowed", label: "No Pets" },
  { value: "negotiable", label: "Negotiable" },
];

export const STATUS_ORDER: PropertyStatus[] = [
  "interested",
  "inspection_booked",
  "inspected",
  "applied",
  "offer_made",
  "won",
  "lost",
  "passed",
];
