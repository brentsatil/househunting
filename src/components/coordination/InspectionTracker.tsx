"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar, Clock, Plus, UserCheck, UserX, ChevronDown, ChevronUp,
  MapPin, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { Inspection } from "@/types/property";

interface InspectionTrackerProps {
  propertyId: string;
  userId: string;
  partnerId?: string | null;
  partnerName?: string;
  address?: string;
}

export function InspectionTracker({
  propertyId,
  userId,
  partnerId,
  partnerName = "Partner",
  address,
}: InspectionTrackerProps) {
  const supabase = createClient();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchInspections = useCallback(async () => {
    const { data } = await supabase
      .from("inspections")
      .select("*")
      .eq("property_id", propertyId)
      .order("datetime", { ascending: true });
    setInspections(data || []);
  }, [propertyId, supabase]);

  useEffect(() => {
    fetchInspections();

    const channel = supabase
      .channel(`inspections-${propertyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inspections",
          filter: `property_id=eq.${propertyId}`,
        },
        () => fetchInspections()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInspections, propertyId, supabase]);

  async function handleAdd() {
    if (!date || !time) return;
    setSaving(true);

    const datetime = new Date(`${date}T${time}`).toISOString();
    await supabase.from("inspections").insert({
      property_id: propertyId,
      datetime,
      attendees: [userId],
      notes: notes || null,
    });

    setDate("");
    setTime("");
    setNotes("");
    setShowAdd(false);
    setSaving(false);
    fetchInspections();
  }

  async function toggleAttendance(inspection: Inspection) {
    const isAttending = inspection.attendees.includes(userId);
    const updated = isAttending
      ? inspection.attendees.filter((id) => id !== userId)
      : [...inspection.attendees, userId];

    await supabase
      .from("inspections")
      .update({ attendees: updated })
      .eq("id", inspection.id);
    fetchInspections();
  }

  async function updateNotes(inspectionId: string, field: "notes" | "post_inspection_notes", value: string) {
    await supabase
      .from("inspections")
      .update({ [field]: value })
      .eq("id", inspectionId);
    fetchInspections();
  }

  const now = new Date();
  const upcoming = inspections.filter((i) => new Date(i.datetime) >= now);
  const past = inspections.filter((i) => new Date(i.datetime) < now);
  const nextInspection = upcoming[0];

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Inspections</CardTitle>
          <Button
            size="sm"
            variant={showAdd ? "secondary" : "default"}
            className="h-8 rounded-lg text-xs gap-1"
            onClick={() => setShowAdd(!showAdd)}
          >
            <Plus className="h-3.5 w-3.5" />
            Book Inspection
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick add form */}
        {showAdd && (
          <div className="rounded-xl border bg-muted/30 p-3.5 space-y-3 animate-in slide-in-from-top-1 duration-200">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 h-9"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Time</label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-1 h-9"
                />
              </div>
            </div>
            <Textarea
              placeholder="Notes (e.g. open home, private inspection)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={saving || !date || !time}
                className="rounded-lg"
              >
                {saving ? "Saving..." : "Confirm"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAdd(false)}
                className="rounded-lg"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Next inspection — prominent */}
        {nextInspection && (
          <InspectionCard
            inspection={nextInspection}
            userId={userId}
            partnerId={partnerId}
            partnerName={partnerName}
            onToggle={toggleAttendance}
            onUpdateNotes={updateNotes}
            isNext
          />
        )}

        {/* Other upcoming */}
        {upcoming.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Also upcoming
            </p>
            {upcoming.slice(1).map((inspection) => (
              <InspectionCard
                key={inspection.id}
                inspection={inspection}
                userId={userId}
                partnerId={partnerId}
                partnerName={partnerName}
                onToggle={toggleAttendance}
                onUpdateNotes={updateNotes}
              />
            ))}
          </div>
        )}

        {/* Past */}
        {past.length > 0 && (
          <PastInspections
            inspections={past}
            userId={userId}
            partnerId={partnerId}
            partnerName={partnerName}
            onUpdateNotes={updateNotes}
          />
        )}

        {inspections.length === 0 && !showAdd && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No inspections scheduled yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InspectionCard({
  inspection,
  userId,
  partnerId,
  partnerName,
  onToggle,
  onUpdateNotes,
  isNext,
}: {
  inspection: Inspection;
  userId: string;
  partnerId?: string | null;
  partnerName: string;
  onToggle: (i: Inspection) => void;
  onUpdateNotes: (id: string, field: "notes" | "post_inspection_notes", val: string) => void;
  isNext?: boolean;
}) {
  const dt = new Date(inspection.datetime);
  const isAttending = inspection.attendees.includes(userId);
  const partnerAttending = partnerId ? inspection.attendees.includes(partnerId) : false;

  return (
    <div
      className={`rounded-xl border p-3.5 space-y-2.5 ${
        isNext ? "border-primary/30 bg-primary/[0.02]" : ""
      }`}
    >
      {/* Date/time row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-muted text-center">
            <span className="text-[10px] font-medium uppercase text-muted-foreground leading-none">
              {dt.toLocaleDateString("en-AU", { month: "short" })}
            </span>
            <span className="text-sm font-bold leading-tight">
              {dt.getDate()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium">
              {dt.toLocaleDateString("en-AU", { weekday: "long" })}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {dt.toLocaleTimeString("en-AU", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        {isNext && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            Next
          </span>
        )}
      </div>

      {/* Who's going */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggle(inspection)}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
            isAttending
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
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
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
              partnerAttending
                ? "bg-green-100 text-green-800"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {partnerAttending ? (
              <UserCheck className="h-3 w-3" />
            ) : (
              <UserX className="h-3 w-3" />
            )}
            {partnerAttending ? `${partnerName} going` : `${partnerName} not going`}
          </span>
        )}
      </div>

      {/* Notes */}
      {inspection.notes && (
        <p className="text-xs text-muted-foreground">{inspection.notes}</p>
      )}
    </div>
  );
}

function PastInspections({
  inspections,
  userId,
  partnerId,
  partnerName,
  onUpdateNotes,
}: {
  inspections: Inspection[];
  userId: string;
  partnerId?: string | null;
  partnerName: string;
  onUpdateNotes: (id: string, field: "notes" | "post_inspection_notes", val: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
      >
        Past ({inspections.length})
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {inspections.map((inspection) => {
            const dt = new Date(inspection.datetime);
            return (
              <div key={inspection.id} className="rounded-xl border p-3 opacity-75 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {dt.toLocaleDateString("en-AU", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                  <Clock className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                  {dt.toLocaleTimeString("en-AU", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
                <PostInspectionNotes
                  inspection={inspection}
                  onSave={(val) => onUpdateNotes(inspection.id, "post_inspection_notes", val)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PostInspectionNotes({
  inspection,
  onSave,
}: {
  inspection: Inspection;
  onSave: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(inspection.post_inspection_notes || "");

  if (inspection.post_inspection_notes && !editing) {
    return (
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-0.5">Post-inspection notes</p>
        <p className="text-sm">{inspection.post_inspection_notes}</p>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
        >
          <Pencil className="h-2.5 w-2.5" />
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Textarea
        placeholder="How was the inspection? What did you think?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="text-sm resize-none"
      />
      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs rounded-lg"
          onClick={() => {
            onSave(text);
            setEditing(false);
          }}
          disabled={!text.trim()}
        >
          Save
        </Button>
        {editing && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
