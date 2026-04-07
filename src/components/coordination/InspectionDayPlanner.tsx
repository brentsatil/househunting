"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Clock,
  MapPin,
  AlertTriangle,
  Car,
  Users,
  UserCheck,
  UserX,
  ArrowDown,
  Download,
  Bed,
  Bath,
  AlertCircle,
  Split,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { InspectionWithProperty } from "@/hooks/useInspections";
import { estimateTravel } from "@/services/travel";
import { cn } from "@/lib/utils";

interface InspectionDayPlannerProps {
  date: Date;
  inspections: InspectionWithProperty[];
  userId: string;
  partnerId?: string | null;
  partnerName?: string;
  partnershipId: string;
  onToggleAttendance: (inspectionId: string, userId: string, attending: boolean) => void;
}

interface TimeSlot {
  inspection: InspectionWithProperty;
  startTime: Date;
  endTime: Date;
  clashes: string[]; // IDs of overlapping inspections
}

interface Transit {
  from: InspectionWithProperty;
  to: InspectionWithProperty;
  availableMinutes: number;
  travel: {
    distanceKm: number;
    drivingMinutes: number;
    isTight: boolean;
    isImpossible: boolean;
  } | null;
}

export function InspectionDayPlanner({
  date,
  inspections,
  userId,
  partnerId,
  partnerName = "Partner",
  partnershipId,
  onToggleAttendance,
}: InspectionDayPlannerProps) {
  const supabase = createClient();

  // Sort inspections chronologically and build the itinerary
  const { slots, transits, hasClashes, hasTightTransits } = useMemo(() => {
    const sorted = [...inspections].sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );

    // Build time slots with clash detection
    const slots: TimeSlot[] = sorted.map((insp) => {
      const start = new Date(insp.datetime);
      const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 min default
      return { inspection: insp, startTime: start, endTime: end, clashes: [] };
    });

    // Detect clashes (overlapping time slots)
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        if (slots[i].endTime > slots[j].startTime) {
          slots[i].clashes.push(slots[j].inspection.id);
          slots[j].clashes.push(slots[i].inspection.id);
        }
      }
    }

    // Calculate travel between consecutive inspections
    const transits: Transit[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const from = sorted[i];
      const to = sorted[i + 1];
      const fromEnd = new Date(
        new Date(from.datetime).getTime() + 30 * 60 * 1000
      );
      const toStart = new Date(to.datetime);
      const availableMinutes = Math.round(
        (toStart.getTime() - fromEnd.getTime()) / 60000
      );

      const travel = estimateTravel(
        from.property.lat ?? null,
        from.property.lng ?? null,
        to.property.lat ?? null,
        to.property.lng ?? null,
        availableMinutes
      );

      transits.push({ from, to, availableMinutes, travel });
    }

    return {
      slots,
      transits,
      hasClashes: slots.some((s) => s.clashes.length > 0),
      hasTightTransits: transits.some(
        (t) => t.travel?.isTight || t.travel?.isImpossible
      ),
    };
  }, [inspections]);

  // Generate split suggestion for clashing inspections
  const splitSuggestion = useMemo(() => {
    if (!partnerId || !hasClashes) return null;

    // Find groups of clashing inspections
    const clashGroups: InspectionWithProperty[][] = [];
    const visited = new Set<string>();

    for (const slot of slots) {
      if (slot.clashes.length === 0 || visited.has(slot.inspection.id))
        continue;

      const group = [slot.inspection];
      visited.add(slot.inspection.id);
      for (const clashId of slot.clashes) {
        if (!visited.has(clashId)) {
          const clashing = inspections.find((i) => i.id === clashId);
          if (clashing) {
            group.push(clashing);
            visited.add(clashId);
          }
        }
      }
      if (group.length >= 2) clashGroups.push(group);
    }

    if (clashGroups.length === 0) return null;

    // For each clash group, suggest splitting between partners
    return clashGroups.map((group) => ({
      inspections: group,
      suggestion: `Split up: you take ${group[0].property.suburb}, ${partnerName} takes ${group[1]?.property.suburb || "the other"}`,
    }));
  }, [partnerId, hasClashes, slots, inspections, partnerName]);

  const dateStr = date.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  async function handleToggle(inspectionId: string, currentlyAttending: boolean) {
    const inspection = inspections.find((i) => i.id === inspectionId);
    if (!inspection) return;

    const updated = currentlyAttending
      ? inspection.attendees.filter((id) => id !== userId)
      : [...inspection.attendees, userId];

    await supabase
      .from("inspections")
      .update({ attendees: updated })
      .eq("id", inspectionId);

    onToggleAttendance(inspectionId, userId, !currentlyAttending);
  }

  if (inspections.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No inspections scheduled for {dateStr}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{dateStr}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {inspections.length} inspection{inspections.length !== 1 ? "s" : ""}
              {hasClashes && (
                <span className="text-amber-600 ml-2">
                  — has time clashes
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1 rounded-lg"
            onClick={() => {
              // Build ICS for this day's inspections
              const ids = inspections.map((i) => i.id).join(",");
              window.location.href = `/api/calendar?partnershipId=${partnershipId}&date=${date.toISOString().split("T")[0]}`;
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Export day
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-0">
        {/* Clash warning */}
        {hasClashes && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-4 space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-medium text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Time clash detected
            </div>
            {splitSuggestion && (
              <div className="space-y-1.5">
                {splitSuggestion.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-xs text-amber-700 bg-white/60 rounded-lg p-2"
                  >
                    <Split className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{s.suggestion}</p>
                      <p className="text-amber-600/70 mt-0.5">
                        Tap the attendance buttons below to assign each person
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!splitSuggestion && (
              <p className="text-xs text-amber-600">
                Some inspections overlap. Consider splitting up or choosing which to attend.
              </p>
            )}
          </div>
        )}

        {/* Timeline */}
        {slots.map((slot, idx) => {
          const isAttending = slot.inspection.attendees.includes(userId);
          const partnerAttending = partnerId
            ? slot.inspection.attendees.includes(partnerId)
            : false;
          const hasClash = slot.clashes.length > 0;
          const transit = transits[idx]; // transit AFTER this inspection

          return (
            <div key={slot.inspection.id}>
              {/* Inspection card */}
              <div
                className={cn(
                  "relative rounded-xl border p-3.5 space-y-2.5 transition-all",
                  hasClash
                    ? "border-amber-300 bg-amber-50/30"
                    : "hover:border-primary/20"
                )}
              >
                {/* Clash indicator */}
                {hasClash && (
                  <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white">
                    <AlertCircle className="h-3 w-3" />
                  </div>
                )}

                {/* Time + property */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Time block */}
                    <div className="flex flex-col items-center text-center shrink-0">
                      <span className="text-lg font-bold tabular-nums">
                        {slot.startTime.toLocaleTimeString("en-AU", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        30 min
                      </span>
                    </div>

                    {/* Property details */}
                    <div className="min-w-0">
                      <Link
                        href={`/property/${slot.inspection.property_id}`}
                        className="text-sm font-medium hover:text-primary transition-colors line-clamp-1"
                      >
                        {slot.inspection.property.address}
                      </Link>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {slot.inspection.property.suburb}{" "}
                        {slot.inspection.property.state}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        {slot.inspection.property.bedrooms != null && (
                          <span className="flex items-center gap-0.5">
                            <Bed className="h-3 w-3" />
                            {slot.inspection.property.bedrooms}
                          </span>
                        )}
                        {slot.inspection.property.bathrooms != null && (
                          <span className="flex items-center gap-0.5">
                            <Bath className="h-3 w-3" />
                            {slot.inspection.property.bathrooms}
                          </span>
                        )}
                        {slot.inspection.property.property_type && (
                          <span className="capitalize">
                            {slot.inspection.property.property_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attendance row */}
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    onClick={() => handleToggle(slot.inspection.id, isAttending)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                      isAttending
                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {isAttending ? (
                      <UserCheck className="h-3 w-3" />
                    ) : (
                      <UserX className="h-3 w-3" />
                    )}
                    {isAttending ? "You're going" : "Not going"}
                  </button>

                  {partnerId && (
                    <span
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                        partnerAttending
                          ? "bg-green-100 text-green-800"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {partnerAttending ? (
                        <UserCheck className="h-3 w-3" />
                      ) : (
                        <UserX className="h-3 w-3" />
                      )}
                      {partnerName}
                    </span>
                  )}

                  {/* Clash: suggest split */}
                  {hasClash && partnerId && (
                    <span className="text-[10px] text-amber-600 flex items-center gap-0.5 ml-auto">
                      <Split className="h-3 w-3" />
                      Split up?
                    </span>
                  )}
                </div>

                {/* Notes */}
                {slot.inspection.notes && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                    {slot.inspection.notes}
                  </p>
                )}
              </div>

              {/* Transit indicator between inspections */}
              {transit && (
                <TransitIndicator transit={transit} />
              )}
            </div>
          );
        })}

        {/* Day summary */}
        <div className="pt-4 mt-2 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {slots[0] &&
                  slots[0].startTime.toLocaleTimeString("en-AU", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                –{" "}
                {slots[slots.length - 1] &&
                  slots[slots.length - 1].endTime.toLocaleTimeString(
                    "en-AU",
                    { hour: "numeric", minute: "2-digit" }
                  )}
              </span>
              {transits.length > 0 && (
                <span className="flex items-center gap-1">
                  <Car className="h-3 w-3" />
                  ~
                  {transits.reduce(
                    (sum, t) => sum + (t.travel?.drivingMinutes || 0),
                    0
                  )}{" "}
                  min total driving
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!hasClashes && !hasTightTransits && (
                <span className="flex items-center gap-1 text-green-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Schedule looks good
                </span>
              )}
              {hasTightTransits && !hasClashes && (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  Tight transit
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TransitIndicator({ transit }: { transit: Transit }) {
  const { travel, availableMinutes } = transit;

  const sameSuburb =
    transit.from.property.suburb.toLowerCase() ===
    transit.to.property.suburb.toLowerCase();

  return (
    <div className="flex items-center gap-2 py-2 pl-6">
      <div className="flex flex-col items-center">
        <ArrowDown className="h-4 w-4 text-muted-foreground/40" />
      </div>
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs",
          travel?.isImpossible
            ? "bg-red-50 text-red-700 border border-red-200"
            : travel?.isTight
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : "bg-muted/50 text-muted-foreground"
        )}
      >
        <Car className="h-3 w-3 shrink-0" />
        {travel ? (
          <>
            <span>
              ~{travel.drivingMinutes} min drive ({travel.distanceKm} km)
            </span>
            <span className="text-[10px] opacity-70">
              {availableMinutes} min available
            </span>
            {travel.isImpossible && (
              <span className="font-semibold text-red-700 flex items-center gap-0.5">
                <AlertTriangle className="h-3 w-3" />
                Not enough time
              </span>
            )}
            {travel.isTight && !travel.isImpossible && (
              <span className="font-medium">Tight</span>
            )}
          </>
        ) : sameSuburb ? (
          <span>Same suburb — ~5 min</span>
        ) : (
          <span>
            {availableMinutes} min gap ·{" "}
            {transit.from.property.suburb} → {transit.to.property.suburb}
          </span>
        )}
      </div>
    </div>
  );
}
