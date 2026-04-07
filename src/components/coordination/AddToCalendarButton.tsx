"use client";

import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { allCalendarLinks } from "@/services/calendar-links";

interface AddToCalendarButtonProps {
  property: {
    address: string;
    suburb: string;
    state: string;
    postcode?: string;
    bedrooms?: number | null;
    bathrooms?: number | null;
    property_type?: string | null;
  };
  datetime: Date;
  inspectionId: string;
  notes?: string | null;
  /** Compact mode for inline use */
  compact?: boolean;
}

export function AddToCalendarButton({
  property,
  datetime,
  inspectionId,
  notes,
  compact,
}: AddToCalendarButtonProps) {
  const links = allCalendarLinks(property, datetime, inspectionId, notes);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={compact ? "h-7 w-7 p-0" : "h-8 text-xs gap-1 rounded-lg"}
          title="Add to calendar"
        >
          <CalendarPlus className={compact ? "h-3.5 w-3.5 text-muted-foreground" : "h-3.5 w-3.5"} />
          {!compact && <span className="hidden sm:inline">Add to Cal</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <a href={links.google} target="_blank" rel="noopener noreferrer">
            <GoogleIcon className="h-4 w-4 mr-2" />
            Google Calendar
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={links.outlook} target="_blank" rel="noopener noreferrer">
            <OutlookIcon className="h-4 w-4 mr-2" />
            Outlook
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            window.location.href = links.ics;
          }}
        >
          <CalendarPlus className="h-4 w-4 mr-2" />
          Apple Calendar / Other (.ics)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 9h18M9 3v18" stroke="currentColor" strokeWidth="2" />
      <circle cx="15" cy="15" r="2" fill="currentColor" />
    </svg>
  );
}

function OutlookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M2 8l10 6 10-6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
