"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ViewToggle, type ViewMode } from "@/components/layout/ViewToggle";
import { AddPropertyBar } from "@/components/property/AddPropertyBar";
import { ExtractionPreview } from "@/components/property/ExtractionPreview";
import { PropertyList } from "@/components/property/PropertyList";
import { PropertyMap } from "@/components/property/PropertyMap";
import { usePartnership } from "@/hooks/usePartnership";
import { useProperties } from "@/hooks/useProperties";
import type { ExtractedProperty, Property } from "@/types/property";
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
  const {
    partnership,
    loading: partnershipLoading,
    partnerName,
    mode,
    updateMode,
  } = usePartnership();
  const {
    properties,
    interactions,
    loading: propertiesLoading,
    addProperty,
  } = useProperties(partnership?.id ?? null);

  const [view, setView] = useState<ViewMode>("grid");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pendingExtraction, setPendingExtraction] =
    useState<ExtractedProperty | null>(null);
  const [saving, setSaving] = useState(false);

  const handleExtracted = useCallback((data: ExtractedProperty) => {
    // If all required fields are present, auto-save immediately
    const hasRequired = data.address && data.suburb && data.postcode && data.state;
    if (hasRequired && !data.missing_fields?.length) {
      handleConfirm(data);
    } else {
      setPendingExtraction(data);
    }
  }, []);

  async function handleConfirm(data: ExtractedProperty) {
    setSaving(true);
    try {
      const property = await addProperty({
        source: data.source,
        source_url: data.source_url || null,
        external_id: data.external_id || null,
        address: data.address!,
        suburb: data.suburb!,
        postcode: data.postcode!,
        state: data.state!,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        property_type: data.property_type ?? null,
        bedrooms: data.bedrooms ?? null,
        bathrooms: data.bathrooms ?? null,
        parking: data.parking ?? null,
        land_size_sqm: data.land_size_sqm ?? null,
        building_size_sqm: data.building_size_sqm ?? null,
        rent_weekly: data.rent_weekly ?? null,
        bond: data.bond ?? null,
        sale_price: data.sale_price ?? null,
        price_guide: data.price_guide ?? null,
        auction_date: data.auction_date ?? null,
        description: data.description ?? null,
        images: data.images ?? [],
        floor_plan_url: data.floor_plan_url ?? null,
        virtual_tour_url: data.virtual_tour_url ?? null,
        agent_name: data.agent_name ?? null,
        agent_agency: data.agent_agency ?? null,
        agent_phone: data.agent_phone ?? null,
        agent_email: data.agent_email ?? null,
        lease_length: data.lease_length ?? null,
        available_date: data.available_date ?? null,
        pet_policy: data.pet_policy ?? null,
        furnished: data.furnished ?? false,
        cooling_off_days: data.cooling_off_days ?? null,
        status: "interested",
        is_active: true,
      } as Partial<Property>);

      setPendingExtraction(null);

      // Trigger background enrichment
      fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: property.id }),
      }).catch(() => {});
    } catch (error) {
      console.error("Error saving property:", error);
    } finally {
      setSaving(false);
    }
  }

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

  const filteredProperties =
    statusFilter === "all"
      ? properties
      : properties.filter((p) => p.status === statusFilter);

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header
        mode={mode}
        onModeChange={updateMode}
        partnerName={partnerName ?? undefined}
      />

      <main className="flex-1 container px-4 py-5 space-y-4 max-w-6xl">
        {/* Add property — always at top, one bar for URL or screenshot */}
        <AddPropertyBar
          onExtracted={handleExtracted}
          disabled={saving}
        />

        {/* Extraction preview — slides in when data extracted */}
        {pendingExtraction && (
          <ExtractionPreview
            data={pendingExtraction}
            mode={mode}
            onConfirm={handleConfirm}
            onDiscard={() => setPendingExtraction(null)}
            saving={saving}
          />
        )}

        {/* Properties header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              Properties
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                {filteredProperties.length}
              </span>
            </h2>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="All" />
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

        {/* Property views */}
        {propertiesLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-72 rounded-2xl bg-muted animate-pulse"
              />
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

        {/* Partner invite — subtle, at bottom */}
        {partnership.status === "pending" && (
          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/[0.02] p-5 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Share this code with your partner to search together
            </p>
            <div className="inline-flex items-center rounded-xl bg-background border px-5 py-2.5 font-mono text-2xl tracking-[0.3em] font-bold">
              {partnership.invite_code}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
