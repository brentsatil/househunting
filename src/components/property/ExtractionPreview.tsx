"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Bed,
  Bath,
  Car,
  MapPin,
  Check,
  Pencil,
  X,
  Loader2,
  AlertTriangle,
  Calendar,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AUSTRALIAN_STATES } from "@/lib/constants";
import { formatAUD } from "@/lib/utils";
import type { ExtractedProperty, SearchMode } from "@/types/property";

interface ExtractionPreviewProps {
  data: ExtractedProperty;
  mode: SearchMode;
  onConfirm: (data: ExtractedProperty) => void;
  onDiscard: () => void;
  saving?: boolean;
}

export function ExtractionPreview({
  data,
  mode,
  onConfirm,
  onDiscard,
  saving,
}: ExtractionPreviewProps) {
  const [editMode, setEditMode] = useState(false);
  const [edited, setEdited] = useState<ExtractedProperty>(data);

  const hasMissing =
    edited.missing_fields && edited.missing_fields.length > 0;
  const leadImage = edited.images?.[0];

  const price =
    mode === "rent"
      ? edited.rent_weekly
        ? `${formatAUD(edited.rent_weekly)}/wk`
        : null
      : edited.sale_price
        ? formatAUD(edited.sale_price)
        : edited.price_guide || null;

  const hasInspections =
    edited.inspection_times && edited.inspection_times.length > 0;

  function updateField(field: string, value: string | number | undefined) {
    setEdited((prev) => ({ ...prev, [field]: value }));
  }

  const canSave =
    edited.address && edited.suburb && edited.postcode && edited.state;

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-primary/[0.02] overflow-hidden animate-in slide-in-from-top-2 duration-300">
      {/* Header strip */}
      <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-b border-primary/10">
        <span className="text-xs font-medium text-primary">
          {hasMissing
            ? "Almost there — fill in missing details"
            : "New listing extracted"}
        </span>
        <div className="flex items-center gap-1">
          {!editMode && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setEditMode(true)}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground"
            onClick={onDiscard}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {editMode ? (
        /* Edit mode — compact required fields only */
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">Address *</Label>
              <Input
                value={edited.address || ""}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="123 Main Street"
                className={`mt-1 h-9 ${!edited.address ? "border-amber-400" : ""}`}
              />
            </div>
            <div>
              <Label className="text-xs">Suburb *</Label>
              <Input
                value={edited.suburb || ""}
                onChange={(e) => updateField("suburb", e.target.value)}
                placeholder="Fitzroy"
                className={`mt-1 h-9 ${!edited.suburb ? "border-amber-400" : ""}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">State *</Label>
                <Select
                  value={edited.state || ""}
                  onValueChange={(v) => updateField("state", v)}
                >
                  <SelectTrigger
                    className={`mt-1 h-9 ${!edited.state ? "border-amber-400" : ""}`}
                  >
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUSTRALIAN_STATES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Postcode *</Label>
                <Input
                  value={edited.postcode || ""}
                  onChange={(e) =>
                    updateField("postcode", e.target.value)
                  }
                  placeholder="3065"
                  className={`mt-1 h-9 ${!edited.postcode ? "border-amber-400" : ""}`}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Beds</Label>
                <Input
                  type="number"
                  value={edited.bedrooms ?? ""}
                  onChange={(e) =>
                    updateField(
                      "bedrooms",
                      e.target.value
                        ? Number(e.target.value)
                        : undefined
                    )
                  }
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Baths</Label>
                <Input
                  type="number"
                  value={edited.bathrooms ?? ""}
                  onChange={(e) =>
                    updateField(
                      "bathrooms",
                      e.target.value
                        ? Number(e.target.value)
                        : undefined
                    )
                  }
                  className="mt-1 h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Cars</Label>
                <Input
                  type="number"
                  value={edited.parking ?? ""}
                  onChange={(e) =>
                    updateField(
                      "parking",
                      e.target.value
                        ? Number(e.target.value)
                        : undefined
                    )
                  }
                  className="mt-1 h-9"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">
                {mode === "rent" ? "Rent ($/wk)" : "Price ($)"}
              </Label>
              <Input
                type="number"
                value={
                  mode === "rent"
                    ? edited.rent_weekly
                      ? edited.rent_weekly / 100
                      : ""
                    : edited.sale_price
                      ? edited.sale_price / 100
                      : ""
                }
                onChange={(e) => {
                  const val = e.target.value
                    ? Number(e.target.value) * 100
                    : undefined;
                  updateField(
                    mode === "rent" ? "rent_weekly" : "sale_price",
                    val
                  );
                }}
                className="mt-1 h-9"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => {
                setEditMode(false);
                setEdited((prev) => ({
                  ...prev,
                  missing_fields: prev.missing_fields?.filter(
                    (f) => !prev[f as keyof ExtractedProperty]
                  ),
                }));
              }}
              disabled={!canSave}
            >
              Done editing
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditMode(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        /* Preview mode */
        <div className="p-4 space-y-3">
          <div className="flex gap-4">
            {/* Thumbnail */}
            {leadImage && (
              <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={leadImage}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="128px"
                />
                {edited.images && edited.images.length > 1 && (
                  <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">
                    +{edited.images.length - 1}
                  </span>
                )}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1.5">
              {price && <p className="text-lg font-bold">{price}</p>}

              <div className="flex items-start gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="line-clamp-1">
                  {edited.address
                    ? `${edited.address}, ${edited.suburb || "?"} ${edited.state || ""} ${edited.postcode || ""}`
                    : "Address needed"}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {edited.bedrooms != null && (
                  <span className="flex items-center gap-1">
                    <Bed className="h-3.5 w-3.5" />
                    {edited.bedrooms}
                  </span>
                )}
                {edited.bathrooms != null && (
                  <span className="flex items-center gap-1">
                    <Bath className="h-3.5 w-3.5" />
                    {edited.bathrooms}
                  </span>
                )}
                {edited.parking != null && (
                  <span className="flex items-center gap-1">
                    <Car className="h-3.5 w-3.5" />
                    {edited.parking}
                  </span>
                )}
                {edited.source !== "manual" && (
                  <span className="text-xs capitalize text-muted-foreground/60">
                    via {edited.source}
                  </span>
                )}
              </div>

              {hasMissing && (
                <div className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  Missing: {edited.missing_fields!.join(", ")}
                  <button
                    onClick={() => setEditMode(true)}
                    className="underline hover:no-underline ml-1"
                  >
                    Fill in
                  </button>
                </div>
              )}
            </div>

            {/* Action */}
            <div className="flex flex-col gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => onConfirm(edited)}
                disabled={!canSave || saving}
                className="gap-1"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                {saving ? "Saving" : "Add"}
              </Button>
            </div>
          </div>

          {/* Extracted inspection times */}
          {hasInspections && (
            <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-blue-800">
                <Calendar className="h-3.5 w-3.5" />
                {edited.inspection_times!.length} open{" "}
                {edited.inspection_times!.length === 1 ? "time" : "times"}{" "}
                found
              </div>
              <div className="flex flex-wrap gap-2">
                {edited.inspection_times!.slice(0, 4).map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-blue-100 px-2.5 py-1 text-xs text-blue-900"
                  >
                    <Clock className="h-3 w-3 text-blue-500" />
                    {t.date} {t.start_time}
                    {t.end_time ? `–${t.end_time}` : ""}
                  </span>
                ))}
                {edited.inspection_times!.length > 4 && (
                  <span className="inline-flex items-center text-xs text-blue-600">
                    +{edited.inspection_times!.length - 4} more
                  </span>
                )}
              </div>
              <p className="text-[11px] text-blue-600/70">
                These will be available to book after adding the property
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
