"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AlignmentData {
  together_score: number;
  agreements: string[];
  disagreements: string[];
  compromise_suggestions: string[];
  verdict: string;
}

interface AlignmentCardProps {
  propertyId: string;
  alignment: AlignmentData | null;
  bothRated: boolean;
  onGenerated?: (data: AlignmentData) => void;
}

export function AlignmentCard({
  propertyId,
  alignment,
  bothRated,
  onGenerated,
}: AlignmentCardProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AlignmentData | null>(alignment);

  async function handleAnalyse() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/alignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        onGenerated?.(json.data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    if (!bothRated) return null;
    return (
      <div className="pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 rounded-lg"
          onClick={handleAnalyse}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {loading ? "Analysing alignment..." : "Get Together Score"}
        </Button>
      </div>
    );
  }

  const scoreColor =
    data.together_score >= 8
      ? "text-green-600 border-green-200 bg-green-50"
      : data.together_score >= 5
        ? "text-amber-600 border-amber-200 bg-amber-50"
        : "text-red-600 border-red-200 bg-red-50";

  return (
    <Card className="mt-4 rounded-xl border-primary/10 bg-gradient-to-br from-primary/[0.02] to-transparent">
      <CardContent className="pt-5 space-y-4">
        {/* Score */}
        <div className="flex items-center gap-4">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full border-2 ${scoreColor}`}
          >
            <span className="text-xl font-bold">{data.together_score}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Together Score
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.verdict}
            </p>
          </div>
        </div>

        {/* Agreements */}
        {data.agreements.length > 0 && (
          <div>
            <p className="text-xs font-medium text-green-700 flex items-center gap-1 mb-1.5">
              <ThumbsUp className="h-3 w-3" />
              You both agree
            </p>
            <ul className="space-y-1">
              {data.agreements.map((a, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground pl-4 relative before:content-[''] before:absolute before:left-1 before:top-[7px] before:h-1 before:w-1 before:rounded-full before:bg-green-400"
                >
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disagreements */}
        {data.disagreements.length > 0 && (
          <div>
            <p className="text-xs font-medium text-amber-700 flex items-center gap-1 mb-1.5">
              <ThumbsDown className="h-3 w-3" />
              You differ on
            </p>
            <ul className="space-y-1">
              {data.disagreements.map((d, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground pl-4 relative before:content-[''] before:absolute before:left-1 before:top-[7px] before:h-1 before:w-1 before:rounded-full before:bg-amber-400"
                >
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Compromises */}
        {data.compromise_suggestions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-primary flex items-center gap-1 mb-1.5">
              <Lightbulb className="h-3 w-3" />
              Compromise ideas
            </p>
            <ul className="space-y-1">
              {data.compromise_suggestions.map((c, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground pl-4 relative before:content-[''] before:absolute before:left-1 before:top-[7px] before:h-1 before:w-1 before:rounded-full before:bg-primary/40"
                >
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Refresh */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs gap-1 text-muted-foreground"
          onClick={handleAnalyse}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          Refresh analysis
        </Button>
      </CardContent>
    </Card>
  );
}
