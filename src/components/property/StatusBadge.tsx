"use client";

import { PROPERTY_STATUSES } from "@/lib/constants";
import type { PropertyStatus } from "@/types/property";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: PropertyStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = PROPERTY_STATUSES.find((s) => s.value === status);
  if (!config) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  );
}
