"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Home, Eye, CalendarCheck, Star, TrendingUp } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { ViewToggle, type ViewMode } from "@/components/layout/ViewToggle";
import { AddPropertyBar } from "@/components/property/AddPropertyBar";
import { ExtractionPreview } from "@/components/property/ExtractionPreview";
import { PropertyList } from "@/components/property/PropertyList";
import { PropertyMap } from "@/components/property/PropertyMap";
import { Skeleton } from "@/components/ui/skeleton";
import { usePartnership } from "@/hooks/usePartnership";
import { useProperties } from "@/hooks/useProperties";
import type { ExtractedProperty, Property } from "@/types/property";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PROPERTY_STATUSES } from "@/lib/constants";

export default function DashboardPage() {
  const router = useRouter();
  const { partnership, loading: partnershipLoading, partnerName, mode, updateMode } = usePartnership();
  const { properties, interactions, loading: propertiesLoading, addProperty } = useProperties(partnership?.id ?? null);
  const [view, setView] = useState<ViewMode>("grid");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pendingExtraction, setPendingExtraction] = useState<ExtractedProperty | null>(null);
  const [saving, setSaving] = useState(false);

  const handleExtracted = useCallback((data: ExtractedProperty) => {
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
        source: data.source, source_url: data.source_url || null,
        external_id: data.external_id || null, address: data.address!,
        suburb: data.suburb!, postcode: data.postcode!, state: data.state!,
        lat: data.lat ?? null, lng: data.lng ?? null,
        property_type: data.property_type ?? null,
        bedrooms: data.bedrooms ?? null, bathrooms: data.bathrooms ?? null,
        parking: data.parking ?? null, land_size_sqm: data.land_size_sqm ?? null,
        building_size_sqm: data.building_size_sqm ?? null,
        rent_weekly: data.rent_weekly ?? null, bond: data.bond ?? null,
        sale_price: data.sale_price ?? null, price_guide: data.price_guide ?? null,
        auction_date: data.auction_date ?? null,
        description: data.description ?? null, images: data.images ?? [],
        floor_plan_url: data.floor_plan_url ?? null,
        virtual_tour_url: data.virtual_tour_url ?? null,
        agent_name: data.agent_name ?? null, agent_agency: data.agent_agency ?? null,
        agent_phone: data.agent_phone ?? null, agent_email: data.agent_email ?? null,
        lease_length: data.lease_length ?? null, available_date: data.available_date ?? null,
        pet_policy: data.pet_policy ?? null, furnished: data.furnished ?? false,
        cooling_off_days: data.cooling_off_days ?? null,
        status: "interested", is_active: true,
      } as Partial<Property>);
      setPendingExtraction(null);
      fetch("/api/enrich", {
        method: "POST", headers: { "Content-Type": "application/json" },
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
      <div className="min-h-screen bg-background">
        <div className="h-16 border-b bg-white/80" />
        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!partnership || !mode) { router.push("/"); return null; }

  const filteredProperties = statusFilter === "all"
    ? properties : properties.filter((p) => p.status === statusFilter);

  // Stats
  const totalProps = properties.length;
  const shortlisted = properties.filter((p) => p.status === "interested" || p.status === "inspection_booked").length;
  const inspections = properties.filter((p) => p.status === "inspection_booked").length;

  return (
    <div className="min-h-screen bg-background">
      <Header mode={mode} onModeChange={updateMode} partnerName={partnerName ?? undefined} />

      <main className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats row */}
        {totalProps > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total", value: totalProps, icon: Home, color: "text-primary bg-primary/10" },
              { label: "Shortlisted", value: shortlisted, icon: Star, color: "text-amber-600 bg-amber-50" },
              { label: "Inspections", value: inspections, icon: CalendarCheck, color: "text-blue-600 bg-blue-50" },
              { label: "This Week", value: properties.filter((p) => {
                const d = new Date(p.created_at);
                const week = new Date(); week.setDate(week.getDate() - 7);
                return d >= week;
              }).length, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add property bar */}
        <AddPropertyBar onExtracted={handleExtracted} disabled={saving} />

        {/* Extraction preview */}
        {pendingExtraction && (
          <ExtractionPreview
            data={pendingExtraction} mode={mode}
            onConfirm={handleConfirm} onDiscard={() => setPendingExtraction(null)} saving={saving}
          />
        )}

        {/* Properties header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Properties</h2>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-9 rounded-xl">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {PROPERTY_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ViewToggle view={view} onChange={setView} />
        </div>

        {/* Property views */}
        {propertiesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
          </div>
        ) : view === "map" ? (
          <PropertyMap properties={filteredProperties} mode={mode} />
        ) : (
          <PropertyList properties={filteredProperties} interactions={interactions} mode={mode} />
        )}

        {/* Partner invite */}
        {partnership.status === "pending" && (
          <div className="rounded-2xl bg-brand-gradient-subtle border border-primary/10 p-8 text-center shadow-sm">
            <h3 className="text-lg font-bold">Invite Your Partner</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Share this code so you can search together in real time.
            </p>
            <div className="inline-flex items-center rounded-2xl bg-white border-2 border-primary/20 px-6 py-3 font-mono text-3xl tracking-[0.3em] font-bold text-primary shadow-sm">
              {partnership.invite_code}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
