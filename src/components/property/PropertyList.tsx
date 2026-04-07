"use client";

import { PropertyCard } from "./PropertyCard";
import type { Property, PropertyInteraction, SearchMode } from "@/types/property";
import { Home, ArrowRight } from "lucide-react";

interface PropertyListProps {
  properties: Property[];
  interactions: Record<string, PropertyInteraction[]>;
  mode: SearchMode;
}

export function PropertyList({ properties, interactions, mode }: PropertyListProps) {
  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="rounded-2xl bg-secondary p-6 mb-5 shadow-sm">
          <Home className="h-12 w-12 text-primary/40" />
        </div>
        <h3 className="text-xl font-bold">No properties yet</h3>
        <p className="text-muted-foreground mt-2 max-w-sm leading-relaxed">
          Paste a listing URL or drop a screenshot above — the property will appear here instantly for both of you.
        </p>
        <div className="flex items-center gap-2 mt-4 text-sm text-primary font-medium">
          <span>Paste a URL above to get started</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
