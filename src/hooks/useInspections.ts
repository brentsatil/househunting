"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Inspection, Property } from "@/types/property";

export interface InspectionWithProperty extends Inspection {
  property: Pick<Property, "id" | "address" | "suburb" | "state" | "images" | "property_type" | "bedrooms" | "bathrooms">;
}

/**
 * Fetches all inspections across all properties for a partnership.
 * Used by the shared calendar view on the dashboard.
 */
export function useInspections(partnershipId: string | null) {
  const [inspections, setInspections] = useState<InspectionWithProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchInspections = useCallback(async () => {
    if (!partnershipId) {
      setLoading(false);
      return;
    }

    // First get all property IDs for this partnership
    const { data: properties } = await supabase
      .from("properties")
      .select("id, address, suburb, state, images, property_type, bedrooms, bathrooms")
      .eq("partnership_id", partnershipId)
      .eq("is_active", true);

    if (!properties || properties.length === 0) {
      setInspections([]);
      setLoading(false);
      return;
    }

    const propertyIds = properties.map((p: { id: string }) => p.id);
    const propertyMap = new Map(properties.map((p: { id: string }) => [p.id, p]));

    const { data: inspectionData } = await supabase
      .from("inspections")
      .select("*")
      .in("property_id", propertyIds)
      .order("datetime", { ascending: true });

    if (inspectionData) {
      const enriched: InspectionWithProperty[] = (inspectionData as Inspection[])
        .map((i: Inspection) => {
          const property = propertyMap.get(i.property_id);
          if (!property) return null;
          return { ...i, property } as InspectionWithProperty;
        })
        .filter((i): i is InspectionWithProperty => i !== null);
      setInspections(enriched);
    }

    setLoading(false);
  }, [partnershipId, supabase]);

  useEffect(() => {
    fetchInspections();

    if (!partnershipId) return;

    const channel = supabase
      .channel(`all-inspections-${partnershipId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inspections",
        },
        () => fetchInspections()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInspections, partnershipId, supabase]);

  const upcoming = inspections.filter(
    (i) => new Date(i.datetime) >= new Date()
  );
  const past = inspections.filter(
    (i) => new Date(i.datetime) < new Date()
  );

  return {
    inspections,
    upcoming,
    past,
    loading,
    refresh: fetchInspections,
  };
}
