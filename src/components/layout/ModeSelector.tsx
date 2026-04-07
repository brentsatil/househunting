"use client";

import { Key, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchMode } from "@/types/property";

interface ModeSelectorProps {
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
}

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="flex items-center rounded-xl bg-secondary p-1 shadow-inner">
      <button
        onClick={() => onChange("rent")}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200",
          mode === "rent"
            ? "bg-white text-primary shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Key className="h-3.5 w-3.5" />
        Renting
      </button>
      <button
        onClick={() => onChange("buy")}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200",
          mode === "buy"
            ? "bg-white text-primary shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Building2 className="h-3.5 w-3.5" />
        Buying
      </button>
    </div>
  );
}
