"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { Inspection } from "@/types/property";

interface InspectionTrackerProps {
  propertyId: string;
  userId: string;
}

export function InspectionTracker({ propertyId, userId }: InspectionTrackerProps) {
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
  }, [fetchInspections]);

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

  async function handleAddNotes(inspectionId: string, postNotes: string) {
    await supabase
      .from("inspections")
      .update({ post_inspection_notes: postNotes })
      .eq("id", inspectionId);

    fetchInspections();
  }

  const upcoming = inspections.filter((i) => new Date(i.datetime) >= new Date());
  const past = inspections.filter((i) => new Date(i.datetime) < new Date());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          Inspections
          <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAdd && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Date</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Time</label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
            <Textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving || !date || !time}>
                {saving ? "Saving..." : "Save Inspection"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Upcoming</h4>
            <div className="space-y-2">
              {upcoming.map((inspection) => (
                <InspectionItem
                  key={inspection.id}
                  inspection={inspection}
                  onAddNotes={handleAddNotes}
                />
              ))}
            </div>
          </div>
        )}

        {/* Past */}
        {past.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Past</h4>
            <div className="space-y-2">
              {past.map((inspection) => (
                <InspectionItem
                  key={inspection.id}
                  inspection={inspection}
                  isPast
                  onAddNotes={handleAddNotes}
                />
              ))}
            </div>
          </div>
        )}

        {inspections.length === 0 && !showAdd && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No inspections scheduled yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function InspectionItem({
  inspection,
  isPast = false,
  onAddNotes,
}: {
  inspection: Inspection;
  isPast?: boolean;
  onAddNotes: (id: string, notes: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [postNotes, setPostNotes] = useState(inspection.post_inspection_notes || "");

  const dt = new Date(inspection.datetime);

  return (
    <div className={`rounded-lg border p-3 ${isPast ? "opacity-75" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {dt.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {dt.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}
        </div>
        {inspection.attendees.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {inspection.attendees.length}
          </div>
        )}
      </div>

      {inspection.notes && (
        <p className="text-sm text-muted-foreground mt-1">{inspection.notes}</p>
      )}

      {isPast && (
        <div className="mt-2">
          {inspection.post_inspection_notes && !editing ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Post-Inspection Notes</p>
              <p className="text-sm mt-0.5">{inspection.post_inspection_notes}</p>
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-primary hover:underline mt-1"
              >
                Edit
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                placeholder="How did the inspection go?"
                value={postNotes}
                onChange={(e) => setPostNotes(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onAddNotes(inspection.id, postNotes);
                    setEditing(false);
                  }}
                >
                  Save Notes
                </Button>
                {editing && (
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
