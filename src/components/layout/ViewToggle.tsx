"use client";

import { LayoutGrid, Map, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "grid" | "list" | "map";

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  const views: { value: ViewMode; icon: React.ReactNode; label: string }[] = [
    { value: "grid", icon: <LayoutGrid className="h-4 w-4" />, label: "Grid" },
    { value: "list", icon: <List className="h-4 w-4" />, label: "List" },
    { value: "map", icon: <Map className="h-4 w-4" />, label: "Map" },
  ];

  return (
    <div className="flex items-center rounded-lg border p-1">
      {views.map(({ value, icon, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-all",
            view === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={label}
        >
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
