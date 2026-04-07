"use client";

import { Train, GraduationCap, Footprints } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SuburbStats } from "@/types/property";

interface SuburbInsightsProps {
  stats: SuburbStats | null;
  suburb: string;
}

export function SuburbInsights({ stats, suburb }: SuburbInsightsProps) {
  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Suburb Insights — {suburb}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Suburb data not yet available. Enrichment will run automatically.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Suburb Insights — {suburb}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scores */}
        {(stats.walk_score || stats.transit_score) && (
          <div className="flex gap-4">
            {stats.walk_score && (
              <div className="flex items-center gap-2">
                <Footprints className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Walk Score</p>
                  <p className="text-2xl font-bold">{stats.walk_score}</p>
                </div>
              </div>
            )}
            {stats.transit_score && (
              <div className="flex items-center gap-2">
                <Train className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Transit Score</p>
                  <p className="text-2xl font-bold">{stats.transit_score}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nearby Schools */}
        {stats.nearby_schools && stats.nearby_schools.length > 0 && (
          <div>
            <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
              <GraduationCap className="h-4 w-4" />
              Nearby Schools
            </h4>
            <ul className="space-y-1">
              {stats.nearby_schools.map((school, i) => (
                <li key={i} className="text-sm flex items-center justify-between">
                  <span>{school.name}</span>
                  {school.distance_km > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {school.distance_km.toFixed(1)}km
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Nearby Transport */}
        {stats.nearby_transport && stats.nearby_transport.length > 0 && (
          <div>
            <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
              <Train className="h-4 w-4" />
              Nearby Transport
            </h4>
            <ul className="space-y-1">
              {stats.nearby_transport.map((stop, i) => (
                <li key={i} className="text-sm flex items-center justify-between">
                  <span>
                    {stop.name}
                    <span className="text-xs text-muted-foreground ml-1">({stop.type})</span>
                  </span>
                  {stop.distance_km > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {stop.distance_km.toFixed(1)}km
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Median prices */}
        {(stats.median_rent_weekly || stats.median_sale_price) && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            {stats.median_rent_weekly && (
              <div>
                <p className="text-xs text-muted-foreground">Median Rent</p>
                <p className="text-sm font-medium">${stats.median_rent_weekly}/wk</p>
              </div>
            )}
            {stats.median_sale_price && (
              <div>
                <p className="text-xs text-muted-foreground">Median Price</p>
                <p className="text-sm font-medium">
                  ${(stats.median_sale_price / 1000).toFixed(0)}k
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
