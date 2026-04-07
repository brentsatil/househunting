"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface DigestData {
  summary: string;
  patterns: string[];
  stale_properties: Array<{ id: string; address: string; suggestion: string }>;
  upcoming_actions: string[];
  search_insight: string;
}

interface SearchDigestProps {
  partnershipId: string;
  mode: "rent" | "buy";
  propertyCount: number;
}

export function SearchDigest({
  partnershipId,
  mode,
  propertyCount,
}: SearchDigestProps) {
  const [data, setData] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (propertyCount < 3) return null;

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnershipId, mode }),
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setExpanded(true);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return (
      <Card className="rounded-2xl border-dashed border-primary/20 bg-primary/[0.02]">
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Search Digest</p>
              <p className="text-xs text-muted-foreground">
                AI analysis of your {propertyCount} saved properties
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="gap-1.5 rounded-lg"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {loading ? "Analysing..." : "Generate"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-primary/10 overflow-hidden">
      <CardContent className="pt-4 pb-3 space-y-0">
        {/* Collapsed summary */}
        <button
          className="w-full flex items-center gap-3 text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Search Digest</p>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {data.summary}
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </button>

        {expanded && (
          <div className="mt-4 space-y-4 pt-3 border-t">
            {/* Full summary */}
            <p className="text-sm text-muted-foreground">{data.summary}</p>

            {/* Patterns */}
            {data.patterns.length > 0 && (
              <div>
                <p className="text-xs font-medium flex items-center gap-1.5 text-primary mb-1.5">
                  <Target className="h-3 w-3" />
                  Patterns in your search
                </p>
                <ul className="space-y-1">
                  {data.patterns.map((p, i) => (
                    <li
                      key={i}
                      className="text-xs text-muted-foreground pl-4 relative before:content-[''] before:absolute before:left-1 before:top-[7px] before:h-1 before:w-1 before:rounded-full before:bg-primary/40"
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Stale properties */}
            {data.stale_properties.length > 0 && (
              <div>
                <p className="text-xs font-medium flex items-center gap-1.5 text-amber-700 mb-1.5">
                  <AlertCircle className="h-3 w-3" />
                  Needs attention
                </p>
                <div className="space-y-1.5">
                  {data.stale_properties.map((sp, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-amber-50/50 border border-amber-100 p-2.5"
                    >
                      <p className="text-xs font-medium">{sp.address}</p>
                      <p className="text-[10px] text-amber-700 mt-0.5">
                        {sp.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {data.upcoming_actions.length > 0 && (
              <div>
                <p className="text-xs font-medium flex items-center gap-1.5 text-emerald-700 mb-1.5">
                  <TrendingUp className="h-3 w-3" />
                  Suggested next steps
                </p>
                <ul className="space-y-1">
                  {data.upcoming_actions.map((a, i) => (
                    <li
                      key={i}
                      className="text-xs text-muted-foreground pl-4 relative before:content-[''] before:absolute before:left-1 before:top-[7px] before:h-1 before:w-1 before:rounded-full before:bg-emerald-400"
                    >
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Insight */}
            {data.search_insight && (
              <div className="rounded-lg bg-primary/[0.03] border border-primary/10 p-3">
                <p className="text-xs flex items-center gap-1.5">
                  <Lightbulb className="h-3 w-3 text-primary shrink-0" />
                  <span className="text-muted-foreground">
                    {data.search_insight}
                  </span>
                </p>
              </div>
            )}

            {/* Refresh */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs gap-1 text-muted-foreground"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              Refresh digest
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
