"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Property, PropertyInteraction } from "@/types/property";

export function useProperties(partnershipId: string | null) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [interactions, setInteractions] = useState<Record<string, PropertyInteraction[]>>({});
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProperties = useCallback(async () => {
    if (!partnershipId) return;

    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("partnership_id", partnershipId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching properties:", error);
      return;
    }

    setProperties(data || []);

    // Fetch interactions for all properties
    if (data && data.length > 0) {
      const propertyIds = data.map((p: Property) => p.id);
      const { data: interactionData } = await supabase
        .from("property_interactions")
        .select("*")
        .in("property_id", propertyIds);

      if (interactionData) {
        const grouped: Record<string, PropertyInteraction[]> = {};
        interactionData.forEach((i: PropertyInteraction) => {
          if (!grouped[i.property_id]) grouped[i.property_id] = [];
          grouped[i.property_id].push(i);
        });
        setInteractions(grouped);
      }
    }

    setLoading(false);
  }, [partnershipId, supabase]);

  useEffect(() => {
    fetchProperties();

    // Subscribe to real-time changes
    if (!partnershipId) return;

    const channel = supabase
      .channel(`properties-${partnershipId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "properties",
          filter: `partnership_id=eq.${partnershipId}`,
        },
        () => {
          fetchProperties();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "property_interactions",
        },
        () => {
          fetchProperties();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnershipId, fetchProperties, supabase]);

  async function addProperty(property: Partial<Property>) {
    const { data, error } = await supabase
      .from("properties")
      .insert({ ...property, partnership_id: partnershipId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function updateProperty(id: string, updates: Partial<Property>) {
    const { error } = await supabase
      .from("properties")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
  }

  async function updateInteraction(
    propertyId: string,
    userId: string,
    updates: Partial<PropertyInteraction>
  ) {
    const { error } = await supabase
      .from("property_interactions")
      .upsert(
        {
          property_id: propertyId,
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "property_id,user_id" }
      );

    if (error) throw error;
  }

  return {
    properties,
    interactions,
    loading,
    addProperty,
    updateProperty,
    updateInteraction,
    refresh: fetchProperties,
  };
}
