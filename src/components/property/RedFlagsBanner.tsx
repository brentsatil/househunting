"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface RedFlag {
  severity: "info" | "warning" | "critical";
  category: string;
  title: string;
  explanation: string;
}

interface RedFlagsBannerProps {
  propertyId: string;
  redFlags: {
    flags: RedFlag[];
    overall_risk: "low" | "medium" | "high";
  } | null;
  onGenerated?: (data: RedFlagsBannerProps["redFlags"]) => void;
}

const severityConfig = {
  critical: {
    icon: ShieldAlert,
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    iconColor: "text-red-600",
    badge: "bg-red-100 text-red-800",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    iconColor: "text-amber-600",
    badge: "bg-amber-100 text-amber-800",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    iconColor: "text-blue-600",
    badge: "bg-blue-100 text-blue-800",
  },
};

const riskColors = {
  low: "text-green-700 bg-green-100",
  medium: "text-amber-700 bg-amber-100",
  high: "text-red-700 bg-red-100",
};

export function RedFlagsBanner({
  propertyId,
  redFlags,
  onGenerated,
}: RedFlagsBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/red-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });
      const json = await res.json();
      if (json.success) {
        onGenerated?.(json.data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  if (!redFlags) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs rounded-lg"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {loading ? "Analysing..." : "Scan for Red Flags"}
      </Button>
    );
  }

  if (redFlags.flags.length === 0) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50/50 p-3 flex items-center gap-2 text-sm text-green-800">
        <Info className="h-4 w-4 text-green-600 shrink-0" />
        No red flags detected. This listing looks straightforward.
      </div>
    );
  }

  const criticalCount = redFlags.flags.filter(
    (f) => f.severity === "critical"
  ).length;
  const warningCount = redFlags.flags.filter(
    (f) => f.severity === "warning"
  ).length;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3.5 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="h-4.5 w-4.5 text-amber-600 shrink-0" />
          <span className="text-sm font-medium">
            {redFlags.flags.length} flag
            {redFlags.flags.length !== 1 ? "s" : ""} detected
          </span>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${riskColors[redFlags.overall_risk]}`}
          >
            {redFlags.overall_risk} risk
          </span>
          {criticalCount > 0 && (
            <span className="text-[10px] font-bold bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full">
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
              {warningCount} warning
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t px-3.5 pb-3.5 space-y-2 pt-2">
          {redFlags.flags.map((flag, i) => {
            const config = severityConfig[flag.severity];
            const Icon = config.icon;
            return (
              <div
                key={i}
                className={`rounded-lg ${config.bg} border ${config.border} p-3 flex gap-2.5`}
              >
                <Icon
                  className={`h-4 w-4 ${config.iconColor} shrink-0 mt-0.5`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${config.text}`}>
                      {flag.title}
                    </p>
                    <span
                      className={`text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded ${config.badge}`}
                    >
                      {flag.category}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${config.text} opacity-80`}>
                    {flag.explanation}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
