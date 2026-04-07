"use client";

import { cn } from "@/lib/utils";
import type { SearchMode } from "@/types/property";

interface ModeSelectorProps {
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
}

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="flex items-center rounded-lg bg-muted p-1">
      <button
        onClick={() => onChange("rent")}
        className={cn(
          "rounded-md px-3 py-1 text-sm font-medium transition-all",
          mode === "rent"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Renting
      </button>
      <button
        onClick={() => onChange("buy")}
        className={cn(
          "rounded-md px-3 py-1 text-sm font-medium transition-all",
          mode === "buy"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Buying
      </button>
    </div>
  );
}
