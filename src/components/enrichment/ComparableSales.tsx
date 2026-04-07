"use client";

import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAUDWhole } from "@/lib/utils";
import type { Comparable } from "@/types/property";

interface ComparableSalesProps {
  comparables: Comparable[] | null;
  mode: "rent" | "buy";
}

export function ComparableSales({ comparables, mode }: ComparableSalesProps) {
  if (!comparables || comparables.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Comparable {mode === "rent" ? "Rentals" : "Sales"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No comparable {mode === "rent" ? "rentals" : "sales"} data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Comparable {mode === "rent" ? "Rentals" : "Sales"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {comparables.map((comp, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{comp.address}</p>
                <p className="text-xs text-muted-foreground">
                  {comp.bedrooms}bed {comp.bathrooms}bath &middot; {comp.property_type}
                  {comp.distance_km > 0 && ` &middot; ${comp.distance_km.toFixed(1)}km away`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">
                  {formatAUDWhole(comp.price)}
                  {comp.price_period && `/${comp.price_period}`}
                </p>
                {comp.listed_date && (
                  <p className="text-xs text-muted-foreground">{comp.listed_date}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
