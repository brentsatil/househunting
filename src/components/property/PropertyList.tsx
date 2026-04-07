"use client";

import { PropertyCard } from "./PropertyCard";
import type { Property, PropertyInteraction, SearchMode } from "@/types/property";
import { Home } from "lucide-react";

interface PropertyListProps {
  properties: Property[];
  interactions: Record<string, PropertyInteraction[]>;
  mode: SearchMode;
}

export function PropertyList({
  properties,
  interactions,
  mode,
}: PropertyListProps) {
  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-2xl bg-muted/50 p-5 mb-4">
          <Home className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold">No properties yet</h3>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
          Paste a listing URL or drop a screenshot above — the property will appear here instantly for both of you.
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
