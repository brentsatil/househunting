"use client";

import { PropertyCard } from "./PropertyCard";
import type { Property, PropertyInteraction, SearchMode } from "@/types/property";

interface PropertyListProps {
  properties: Property[];
  interactions: Record<string, PropertyInteraction[]>;
  mode: SearchMode;
}

export function PropertyList({ properties, interactions, mode }: PropertyListProps) {
  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">No properties yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Paste a listing URL above to get started, or add a property manually.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          interactions={interactions[property.id] || []}
          mode={mode}
        />
      ))}
    </div>
  );
}
