"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  X,
  Trophy,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAUD } from "@/lib/utils";
import type { Property, SearchMode } from "@/types/property";

interface ComparisonDimension {
  name: string;
  ratings: Record<string, { score: number; note: string }>;
}

interface CompareResult {
  dimensions: ComparisonDimension[];
  per_property: Record<string, { strengths: string[]; weaknesses: string[] }>;
  recommendation: string;
  key_tradeoff: string;
}

interface CompareViewProps {
  properties: Property[];
  mode: SearchMode;
  onClose: () => void;
}

export function CompareView({ properties, mode, onClose }: CompareViewProps) {
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCompare() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyIds: properties.map((p) => p.id),
          mode,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setResult(json.data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  function priceDisplay(p: Property) {
    return mode === "rent"
      ? p.rent_weekly
        ? `${formatAUD(p.rent_weekly)}/wk`
        : "TBA"
      : p.sale_price
        ? formatAUD(p.sale_price)
        : p.price_guide || "TBA";
  }

  return (
    <Card className="rounded-2xl shadow-lg border-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Compare Properties
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Property headers */}
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${properties.length}, 1fr)` }}>
          {properties.map((p) => (
            <div key={p.id} className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-sm font-bold">{priceDisplay(p)}</p>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {p.address}, {p.suburb}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {p.bedrooms ?? "?"}bed {p.bathrooms ?? "?"}bath {p.parking ?? "?"}car
              </p>
            </div>
          ))}
        </div>

        {!result && (
          <Button
            className="w-full gap-2 rounded-xl"
            onClick={handleCompare}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? "Comparing..." : "Run AI Comparison"}
          </Button>
        )}

        {result && (
          <>
            {/* Comparison matrix */}
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-2.5 font-medium text-muted-foreground">
                      Dimension
                    </th>
                    {properties.map((p) => (
                      <th key={p.id} className="p-2.5 font-medium text-center text-muted-foreground">
                        {p.suburb}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.dimensions.map((dim) => (
                    <tr key={dim.name} className="border-t">
                      <td className="p-2.5 font-medium">{dim.name}</td>
                      {properties.map((p) => {
                        const rating = dim.ratings[p.id];
                        if (!rating) return <td key={p.id} className="p-2.5 text-center">-</td>;
                        const barWidth = rating.score * 10;
                        const color =
                          rating.score >= 7
                            ? "bg-green-400"
                            : rating.score >= 4
                              ? "bg-amber-400"
                              : "bg-red-400";
                        return (
                          <td key={p.id} className="p-2.5">
                            <div className="flex items-center gap-1.5">
                              <div className="w-12 bg-muted rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${color}`}
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                              <span className="font-bold text-[10px]">
                                {rating.score}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {rating.note}
                            </p>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Strengths & weaknesses */}
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${properties.length}, 1fr)` }}>
              {properties.map((p) => {
                const data = result.per_property[p.id];
                if (!data) return null;
                return (
                  <div key={p.id} className="rounded-lg border p-3 space-y-2">
                    <p className="text-xs font-bold">{p.suburb}</p>
                    {data.strengths.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium text-green-700 flex items-center gap-1">
                          <Trophy className="h-2.5 w-2.5" /> Strengths
                        </p>
                        <ul className="space-y-0.5 mt-1">
                          {data.strengths.map((s, i) => (
                            <li key={i} className="text-[10px] text-muted-foreground">
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {data.weaknesses.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium text-amber-700 flex items-center gap-1">
                          <AlertTriangle className="h-2.5 w-2.5" /> Weaknesses
                        </p>
                        <ul className="space-y-0.5 mt-1">
                          {data.weaknesses.map((w, i) => (
                            <li key={i} className="text-[10px] text-muted-foreground">
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Recommendation */}
            <div className="rounded-xl bg-primary/[0.03] border border-primary/10 p-4 space-y-2">
              <p className="text-xs font-medium flex items-center gap-1.5 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                AI Recommendation
              </p>
              <p className="text-sm">{result.recommendation}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                <ArrowRight className="h-3 w-3" />
                Key tradeoff: {result.key_tradeoff}
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs gap-1 text-muted-foreground"
              onClick={handleCompare}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              Re-run comparison
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
