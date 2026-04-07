"use client";

import type { Property, SearchMode } from "@/types/property";
import { formatAUD } from "@/lib/utils";

interface PropertyMapProps {
  properties: Property[];
  mode: SearchMode;
}

export function PropertyMap({ properties, mode }: PropertyMapProps) {
  const propertiesWithCoords = properties.filter((p) => p.lat && p.lng);

  if (propertiesWithCoords.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border bg-muted">
        <p className="text-muted-foreground">
          No properties with location data to display on the map.
        </p>
      </div>
    );
  }

  // Placeholder map — requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to be set
  // When the API key is configured, this will render a full Google Maps view
  return (
    <div className="rounded-xl border bg-muted overflow-hidden">
      <div className="p-4 text-center text-sm text-muted-foreground border-b">
        Map view requires a Google Maps API key. Set <code className="text-xs bg-background px-1 py-0.5 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your <code className="text-xs bg-background px-1 py-0.5 rounded">.env.local</code> file.
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {propertiesWithCoords.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-lg bg-background p-3 shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
              {p.bedrooms ?? "?"}BR
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.address}</p>
              <p className="text-xs text-muted-foreground">
                {p.suburb} &middot;{" "}
                {mode === "rent"
                  ? p.rent_weekly
                    ? `${formatAUD(p.rent_weekly)}/wk`
                    : "TBA"
                  : p.sale_price
                    ? formatAUD(p.sale_price)
                    : "TBA"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
