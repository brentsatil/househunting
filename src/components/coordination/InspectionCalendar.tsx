"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Download,
  UserCheck,
  UserX,
  Bed,
  Bath,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InspectionWithProperty } from "@/hooks/useInspections";
import { cn } from "@/lib/utils";

interface InspectionCalendarProps {
  inspections: InspectionWithProperty[];
  userId: string;
  partnerId?: string | null;
  partnerName?: string;
  partnershipId: string;
  loading?: boolean;
}

export function InspectionCalendar({
  inspections,
  userId,
  partnerId,
  partnerName = "Partner",
  partnershipId,
  loading,
}: InspectionCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Start from Monday (1) — adjust if first day is Sunday (0)
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      inspections: InspectionWithProperty[];
    }> = [];

    // Previous month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        inspections: [],
      });
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dayStr = date.toDateString();
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString(),
        inspections: inspections.filter(
          (i) => new Date(i.datetime).toDateString() === dayStr
        ),
      });
    }

    // Next month padding (fill to complete weeks)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const date = new Date(year, month + 1, i);
        days.push({
          date,
          isCurrentMonth: false,
          isToday: false,
          inspections: [],
        });
      }
    }

    return days;
  }, [currentMonth, inspections, today]);

  // Upcoming inspections list
  const upcoming = useMemo(
    () =>
      inspections
        .filter((i) => new Date(i.datetime) >= today)
        .sort(
          (a, b) =>
            new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
        ),
    [inspections, today]
  );

  function prevMonth() {
    setCurrentMonth(
      (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1)
    );
  }

  function nextMonth() {
    setCurrentMonth(
      (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1)
    );
  }

  function goToToday() {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 h-96 rounded-2xl bg-muted animate-pulse" />
        <div className="h-96 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Calendar grid */}
      <Card className="lg:col-span-2 rounded-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">
                {currentMonth.toLocaleDateString("en-AU", {
                  month: "long",
                  year: "numeric",
                })}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={goToToday}
              >
                Today
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={prevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={nextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div
                key={day}
                className="text-center text-[11px] font-medium text-muted-foreground py-1.5"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 border-t border-l">
            {calendarDays.map((day, idx) => (
              <div
                key={idx}
                className={cn(
                  "border-r border-b min-h-[72px] p-1 transition-colors",
                  !day.isCurrentMonth && "bg-muted/30",
                  day.isToday && "bg-primary/[0.03]"
                )}
              >
                <span
                  className={cn(
                    "inline-flex items-center justify-center h-6 w-6 rounded-full text-xs",
                    day.isToday &&
                      "bg-primary text-primary-foreground font-bold",
                    !day.isCurrentMonth && "text-muted-foreground/50"
                  )}
                >
                  {day.date.getDate()}
                </span>

                {/* Inspection dots */}
                <div className="mt-0.5 space-y-0.5">
                  {day.inspections.slice(0, 3).map((insp) => {
                    const dt = new Date(insp.datetime);
                    const isPast = dt < new Date();
                    return (
                      <Link
                        key={insp.id}
                        href={`/property/${insp.property_id}`}
                        className={cn(
                          "block truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight transition-colors",
                          isPast
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/10 text-primary hover:bg-primary/20"
                        )}
                        title={`${insp.property.address}, ${insp.property.suburb} — ${dt.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}`}
                      >
                        {dt.toLocaleTimeString("en-AU", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}{" "}
                        {insp.property.suburb}
                      </Link>
                    );
                  })}
                  {day.inspections.length > 3 && (
                    <span className="block text-[10px] text-muted-foreground px-1">
                      +{day.inspections.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming inspections sidebar */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Upcoming ({upcoming.length})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => {
                window.location.href = `/api/calendar?partnershipId=${partnershipId}`;
              }}
              title="Download all inspections as ICS file"
            >
              <Download className="h-3 w-3" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5 max-h-[400px] overflow-y-auto">
          {upcoming.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No upcoming inspections
            </div>
          ) : (
            upcoming.map((insp) => (
              <UpcomingInspectionCard
                key={insp.id}
                inspection={insp}
                userId={userId}
                partnerId={partnerId}
                partnerName={partnerName}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UpcomingInspectionCard({
  inspection,
  userId,
  partnerId,
  partnerName,
}: {
  inspection: InspectionWithProperty;
  userId: string;
  partnerId?: string | null;
  partnerName: string;
}) {
  const dt = new Date(inspection.datetime);
  const isAttending = inspection.attendees.includes(userId);
  const partnerAttending = partnerId
    ? inspection.attendees.includes(partnerId)
    : false;

  const daysUntil = Math.ceil(
    (dt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Link
      href={`/property/${inspection.property_id}`}
      className="block rounded-xl border p-3 space-y-2 hover:border-primary/30 hover:bg-primary/[0.02] transition-all"
    >
      {/* Date row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary text-center">
            <span className="text-[9px] font-medium uppercase leading-none">
              {dt.toLocaleDateString("en-AU", { month: "short" })}
            </span>
            <span className="text-sm font-bold leading-tight">
              {dt.getDate()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium">
              {dt.toLocaleDateString("en-AU", { weekday: "short" })}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {dt.toLocaleTimeString("en-AU", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        {daysUntil <= 2 && (
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
              daysUntil === 0
                ? "text-amber-700 bg-amber-100"
                : "text-primary bg-primary/10"
            )}
          >
            {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : "2 days"}
          </span>
        )}
      </div>

      {/* Property info */}
      <div className="flex items-start gap-1 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
        <span className="line-clamp-1">
          {inspection.property.address}, {inspection.property.suburb}{" "}
          {inspection.property.state}
        </span>
      </div>

      {/* Property features */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {inspection.property.bedrooms != null && (
          <span className="flex items-center gap-0.5">
            <Bed className="h-3 w-3" />
            {inspection.property.bedrooms}
          </span>
        )}
        {inspection.property.bathrooms != null && (
          <span className="flex items-center gap-0.5">
            <Bath className="h-3 w-3" />
            {inspection.property.bathrooms}
          </span>
        )}
        {inspection.property.property_type && (
          <span className="capitalize">
            {inspection.property.property_type}
          </span>
        )}
      </div>

      {/* Attendance */}
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
            isAttending
              ? "bg-green-100 text-green-800"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isAttending ? (
            <UserCheck className="h-2.5 w-2.5" />
          ) : (
            <UserX className="h-2.5 w-2.5" />
          )}
          You
        </span>
        {partnerId && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
              partnerAttending
                ? "bg-green-100 text-green-800"
                : "bg-muted text-muted-foreground"
            )}
          >
            {partnerAttending ? (
              <UserCheck className="h-2.5 w-2.5" />
            ) : (
              <UserX className="h-2.5 w-2.5" />
            )}
            {partnerName}
          </span>
        )}
      </div>
    </Link>
  );
}
