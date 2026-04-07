"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { PropertyDetail } from "@/components/property/PropertyDetail";
import { CommentThread } from "@/components/coordination/CommentThread";
import { InspectionTracker } from "@/components/coordination/InspectionTracker";
import { usePartnership } from "@/hooks/usePartnership";
import { useProperties } from "@/hooks/useProperties";
import { useRealtimeComments } from "@/hooks/useRealtimeComments";
import type { Property } from "@/types/property";

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  const { partnership, userId, mode, updateMode, partnerName } = usePartnership();
  const { properties, interactions, updateProperty, updateInteraction } = useProperties(
    partnership?.id ?? null
  );
  const { comments, addComment } = useRealtimeComments(propertyId);

  const property = properties.find((p) => p.id === propertyId);
  const propertyInteractions = interactions[propertyId] || [];

  if (!property || !mode || !userId) {
    return (
      <div className="min-h-screen">
        <Header mode={mode} onModeChange={updateMode} partnerName={partnerName ?? undefined} />
        <div className="container px-4 py-16 text-center">
          <p className="text-muted-foreground">Loading property...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header mode={mode} onModeChange={updateMode} partnerName={partnerName ?? undefined} />

      <main className="container max-w-4xl px-4 py-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Back
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

        {/* Comments */}
        <CommentThread
          comments={comments}
          currentUserId={userId}
          onAddComment={(content) => addComment(content, userId)}
        />

        {/* Inspections */}
        <InspectionTracker
          propertyId={propertyId}
          userId={userId}
        />
      </main>
    </div>
  );
}
