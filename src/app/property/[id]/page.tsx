"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/layout/Header";
import { PropertyDetail } from "@/components/property/PropertyDetail";
import { CommentThread } from "@/components/coordination/CommentThread";
import { InspectionTracker } from "@/components/coordination/InspectionTracker";
import { PartnerRatings } from "@/components/coordination/PartnerRatings";
import { SuburbInsights } from "@/components/enrichment/SuburbInsights";
import { ZoningInfo } from "@/components/enrichment/ZoningInfo";
import { usePartnership } from "@/hooks/usePartnership";
import { useProperties } from "@/hooks/useProperties";
import { useRealtimeComments } from "@/hooks/useRealtimeComments";
import { createClient } from "@/lib/supabase/client";
import type { ExtractedProperty } from "@/types/property";

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;
  const { partnership, userId, mode, updateMode, partnerName } =
    usePartnership();
  const { properties, interactions, updateProperty, updateInteraction } =
    useProperties(partnership?.id ?? null);
  const { comments, addComment } = useRealtimeComments(propertyId);

  // Try to recover extracted inspection times for this property
  const [suggestedTimes, setSuggestedTimes] = useState<
    ExtractedProperty["inspection_times"]
  >(undefined);

  const property = properties.find((p) => p.id === propertyId);
  const propertyInteractions = interactions[propertyId] || [];
  const partnerId =
    partnership && userId
      ? userId === partnership.user1_id
        ? partnership.user2_id
        : partnership.user1_id
      : null;

  // Re-extract inspection times from the source URL if available
  const fetchSuggestedTimes = useCallback(async () => {
    if (!property?.source_url) return;
    try {
      // Check if we have cached extraction data for this property
      const supabase = createClient();
      const { data: inspections } = await supabase
        .from("inspections")
        .select("id")
        .eq("property_id", propertyId);

      // Only fetch suggestions if no inspections exist yet
      if (inspections && inspections.length > 0) return;

      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: property.source_url }),
      });
      const result = await response.json();
      if (
        result.success &&
        result.data?.inspection_times?.length > 0
      ) {
        setSuggestedTimes(result.data.inspection_times);
      } else if (
        result.partial?.inspection_times?.length > 0
      ) {
        setSuggestedTimes(result.partial.inspection_times);
      }
    } catch {
      // Silently fail — suggestions are a nice-to-have
    }
  }, [property?.source_url, propertyId]);

  useEffect(() => {
    if (property?.source_url) {
      fetchSuggestedTimes();
    }
  }, [property?.source_url, fetchSuggestedTimes]);

  if (!property || !mode || !userId) {
    return (
      <div className="min-h-screen bg-background">
        <Header
          mode={mode}
          onModeChange={updateMode}
          partnerName={partnerName ?? undefined}
        />
        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-[400px] w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        mode={mode}
        onModeChange={updateMode}
        partnerName={partnerName ?? undefined}
      />

      <main className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto space-y-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to properties
        </Button>

        <PropertyDetail
          property={property}
          interactions={propertyInteractions}
          mode={mode}
          currentUserId={userId}
          onRatingChange={async (rating) => {
            await updateInteraction(propertyId, userId, { rating });
          }}
          onStatusChange={async (status) => {
            await updateProperty(propertyId, { status });
          }}
        />

        {/* Tabbed sections */}
        <Tabs defaultValue="plan" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-12 rounded-xl bg-secondary p-1">
            <TabsTrigger
              value="plan"
              className="rounded-lg text-sm data-[state=active]:shadow-sm"
            >
              Plan
            </TabsTrigger>
            <TabsTrigger
              value="discuss"
              className="rounded-lg text-sm data-[state=active]:shadow-sm"
            >
              Discuss
              {comments.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-primary/15 text-primary rounded-full px-1.5 font-bold">
                  {comments.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="rate"
              className="rounded-lg text-sm data-[state=active]:shadow-sm"
            >
              Rate
            </TabsTrigger>
            <TabsTrigger
              value="area"
              className="rounded-lg text-sm data-[state=active]:shadow-sm"
            >
              Area
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plan" className="mt-4">
            <InspectionTracker
              propertyId={propertyId}
              userId={userId}
              partnerId={partnerId}
              partnerName={partnerName}
              address={property.address}
              suggestedTimes={suggestedTimes}
            />
          </TabsContent>
          <TabsContent value="discuss" className="mt-4">
            <CommentThread
              comments={comments}
              currentUserId={userId}
              onAddComment={(content) =>
                addComment(content, userId)
              }
            />
          </TabsContent>
          <TabsContent value="rate" className="mt-4">
            <PartnerRatings
              interactions={propertyInteractions}
              currentUserId={userId}
              onRatingChange={async (rating) => {
                await updateInteraction(propertyId, userId, {
                  rating,
                });
              }}
              user1Name="You"
              user2Name={partnerName}
            />
          </TabsContent>
          <TabsContent value="area" className="mt-4 space-y-4">
            <SuburbInsights stats={null} suburb={property.suburb} />
            <ZoningInfo zoning={null} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
