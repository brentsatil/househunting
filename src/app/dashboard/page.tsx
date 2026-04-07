"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ViewToggle, type ViewMode } from "@/components/layout/ViewToggle";
import { URLPasteInput } from "@/components/property/URLPasteInput";
import { PropertyList } from "@/components/property/PropertyList";
import { PropertyMap } from "@/components/property/PropertyMap";
import { usePartnership } from "@/hooks/usePartnership";
import { useProperties } from "@/hooks/useProperties";
import type { ExtractedProperty } from "@/types/property";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROPERTY_STATUSES } from "@/lib/constants";

export default function DashboardPage() {
  const router = useRouter();
  const { partnership, userId, loading: partnershipLoading, partnerName, mode, updateMode } = usePartnership();
  const { properties, interactions, loading: propertiesLoading } = useProperties(partnership?.id ?? null);
  const [view, setView] = useState<ViewMode>("grid");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  if (partnershipLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!partnership || !mode) {
    router.push("/");
    return null;
  }

  function handleExtracted(data: ExtractedProperty) {
    // Navigate to add page with extracted data
    const params = new URLSearchParams();
    params.set("data", JSON.stringify(data));
    router.push(`/property/add?${params.toString()}`);
  }

  const filteredProperties =
    statusFilter === "all"
      ? properties
      : properties.filter((p) => p.status === statusFilter);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        mode={mode}
        onModeChange={updateMode}
        partnerName={partnerName ?? undefined}
      />

      <main className="flex-1 container px-4 py-6 space-y-6">
        {/* URL Paste Input */}
        <div className="rounded-xl border bg-card p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-3">Add a Property</h2>
          <URLPasteInput
            onExtracted={handleExtracted}
            onManualEntry={() => router.push("/property/add")}
          />
        </div>

        {/* Filters + View Toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              Properties
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filteredProperties.length})
              </span>
            </h2>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {PROPERTY_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ViewToggle view={view} onChange={setView} />
        </div>

        {/* Property Views */}
        {propertiesLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : view === "map" ? (
          <PropertyMap properties={filteredProperties} mode={mode} />
        ) : (
          <PropertyList
            properties={filteredProperties}
            interactions={interactions}
            mode={mode}
          />
        )}

        {/* Partner invite code */}
        {partnership.status === "pending" && (
          <div className="rounded-xl border border-dashed border-primary/50 bg-primary/5 p-6 text-center">
            <h3 className="font-semibold">Invite Your Partner</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-3">
              Share this code with your partner so they can join your search.
            </p>
            <div className="inline-flex items-center rounded-lg bg-background border px-4 py-2 font-mono text-2xl tracking-widest">
              {partnership.invite_code}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
