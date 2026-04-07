"use client";

import { LayoutGrid, Map, List, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "grid" | "list" | "map" | "calendar";

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  const views: { value: ViewMode; icon: React.ReactNode; label: string }[] = [
    { value: "grid", icon: <LayoutGrid className="h-4 w-4" />, label: "Grid" },
    { value: "list", icon: <List className="h-4 w-4" />, label: "List" },
    { value: "calendar", icon: <CalendarDays className="h-4 w-4" />, label: "Calendar" },
    { value: "map", icon: <Map className="h-4 w-4" />, label: "Map" },
  ];

  return (
    <div className="flex items-center rounded-xl bg-secondary p-1 shadow-inner">
      {views.map(({ value, icon, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200",
            view === value
              ? "bg-white text-primary shadow-sm"
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
