"use client";

import { Shield, Droplets, Flame, Landmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CouncilZoning } from "@/types/property";

interface ZoningInfoProps {
  zoning: CouncilZoning | null;
}

export function ZoningInfo({ zoning }: ZoningInfoProps) {
  if (!zoning) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Council & Zoning</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Zoning data not yet available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Council & Zoning</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {zoning.local_government_area && (
          <div>
            <p className="text-xs text-muted-foreground">Local Government Area</p>
            <p className="text-sm font-medium">{zoning.local_government_area}</p>
          </div>
        )}

        {zoning.zone_code && (
          <div>
            <p className="text-xs text-muted-foreground">Zoning</p>
            <p className="text-sm font-medium">
              {zoning.zone_code}
              {zoning.zone_description && ` — ${zoning.zone_description}`}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {zoning.heritage_overlay && (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
              <Landmark className="h-3.5 w-3.5" />
              Heritage Overlay
            </div>
          )}
          {zoning.flood_zone && (
            <div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
              <Droplets className="h-3.5 w-3.5" />
              Flood Zone
            </div>
          )}
          {zoning.bushfire_prone && (
            <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs text-red-700">
              <Flame className="h-3.5 w-3.5" />
              Bushfire Prone
            </div>
          )}
          {!zoning.heritage_overlay && !zoning.flood_zone && !zoning.bushfire_prone && (
            <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs text-green-700">
              <Shield className="h-3.5 w-3.5" />
              No overlays detected
            </div>
          )}
        </div>

        {zoning.heritage_details && (
          <p className="text-xs text-muted-foreground">{zoning.heritage_details}</p>
        )}
        {zoning.flood_zone_details && (
          <p className="text-xs text-muted-foreground">{zoning.flood_zone_details}</p>
        )}
      </CardContent>
    </Card>
  );
}
