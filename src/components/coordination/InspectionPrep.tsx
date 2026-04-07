"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  MessageCircleQuestion,
  Search,
  AlertTriangle,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Square,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface InspectionPrepData {
  questions_for_agent: string[];
  things_to_check: string[];
  red_flags_to_watch: string[];
  bring_items: string[];
}

interface InspectionPrepProps {
  propertyId: string;
}

const sections = [
  {
    key: "questions_for_agent" as const,
    label: "Questions for the Agent",
    icon: MessageCircleQuestion,
    color: "text-blue-700",
    bg: "bg-blue-50",
  },
  {
    key: "things_to_check" as const,
    label: "Things to Check",
    icon: Search,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
  },
  {
    key: "red_flags_to_watch" as const,
    label: "Red Flags to Watch",
    icon: AlertTriangle,
    color: "text-amber-700",
    bg: "bg-amber-50",
  },
  {
    key: "bring_items" as const,
    label: "What to Bring",
    icon: Briefcase,
    color: "text-purple-700",
    bg: "bg-purple-50",
  },
];

export function InspectionPrep({ propertyId }: InspectionPrepProps) {
  const [data, setData] = useState<InspectionPrepData | null>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map((s) => s.key))
  );

  async function handleGenerate() {
    setLoading(true);
    setChecked(new Set());
    try {
      const res = await fetch("/api/ai/inspection-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  function toggleCheck(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleSection(key: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  if (!data) {
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
        {loading ? "Generating prep..." : "Inspection Prep"}
      </Button>
    );
  }

  const totalItems = sections.reduce(
    (sum, s) => sum + (data[s.key]?.length || 0),
    0
  );
  const checkedCount = checked.size;

  return (
    <Card className="rounded-xl border-primary/10 mt-3 animate-in slide-in-from-top-2 duration-300">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Inspection Prep
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              {checkedCount}/{totalItems} done
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {sections.map((section) => {
          const items = data[section.key] || [];
          if (items.length === 0) return null;
          const isExpanded = expandedSections.has(section.key);
          const Icon = section.icon;

          return (
            <div key={section.key}>
              <button
                className="flex items-center gap-2 w-full text-left"
                onClick={() => toggleSection(section.key)}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-md ${section.bg}`}
                >
                  <Icon className={`h-3.5 w-3.5 ${section.color}`} />
                </div>
                <span className={`text-xs font-medium ${section.color} flex-1`}>
                  {section.label} ({items.length})
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
              {isExpanded && (
                <ul className="mt-1.5 space-y-1 ml-8">
                  {items.map((item, i) => {
                    const key = `${section.key}-${i}`;
                    const isChecked = checked.has(key);
                    return (
                      <li key={i}>
                        <button
                          className={`flex items-start gap-2 text-xs text-left w-full transition-opacity ${isChecked ? "opacity-50 line-through" : ""}`}
                          onClick={() => toggleCheck(key)}
                        >
                          {isChecked ? (
                            <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          ) : (
                            <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          )}
                          <span className="text-muted-foreground">{item}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
