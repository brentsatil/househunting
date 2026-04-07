"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  const { partnership, userId, mode, updateMode, partnerName } =
    usePartnership();
  const {
    properties,
    interactions,
    updateProperty,
    updateInteraction,
  } = useProperties(partnership?.id ?? null);
  const { comments, addComment } = useRealtimeComments(propertyId);

  const property = properties.find((p) => p.id === propertyId);
  const propertyInteractions = interactions[propertyId] || [];

  // Determine partner's user ID
  const partnerId =
    partnership && userId
      ? userId === partnership.user1_id
        ? partnership.user2_id
        : partnership.user1_id
      : null;

  if (!property || !mode || !userId) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header
          mode={mode}
          onModeChange={updateMode}
          partnerName={partnerName ?? undefined}
        />
        <div className="container px-4 py-16 text-center">
          <div className="animate-pulse text-muted-foreground">
            Loading property...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header
        mode={mode}
        onModeChange={updateMode}
        partnerName={partnerName ?? undefined}
      />

      <main className="container max-w-4xl px-4 py-4 space-y-4">
        {/* Back */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-1 -ml-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Property header: images, price, features, status */}
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

        {/* Tabbed sections — mobile-friendly */}
        <Tabs defaultValue="plan" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-10 rounded-xl">
            <TabsTrigger value="plan" className="rounded-lg text-xs sm:text-sm">
              Plan
            </TabsTrigger>
            <TabsTrigger value="discuss" className="rounded-lg text-xs sm:text-sm">
              Discuss
              {comments.length > 0 && (
                <span className="ml-1 text-[10px] bg-primary/10 text-primary rounded-full px-1.5">
                  {comments.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="rate" className="rounded-lg text-xs sm:text-sm">
              Rate
            </TabsTrigger>
            <TabsTrigger value="area" className="rounded-lg text-xs sm:text-sm">
              Area
            </TabsTrigger>
          </TabsList>

          {/* Plan tab — inspections + key actions */}
          <TabsContent value="plan" className="mt-3 space-y-4">
            <InspectionTracker
              propertyId={propertyId}
              userId={userId}
              partnerId={partnerId}
              partnerName={partnerName}
              address={property.address}
            />
          </TabsContent>

          {/* Discuss tab — comments */}
          <TabsContent value="discuss" className="mt-3">
            <CommentThread
              comments={comments}
              currentUserId={userId}
              onAddComment={(content) => addComment(content, userId)}
            />
          </TabsContent>

          {/* Rate tab — partner ratings + pros/cons */}
          <TabsContent value="rate" className="mt-3">
            <PartnerRatings
              interactions={propertyInteractions}
              currentUserId={userId}
              onRatingChange={async (rating) => {
                await updateInteraction(propertyId, userId, { rating });
              }}
              user1Name="You"
              user2Name={partnerName}
            />
          </TabsContent>

          {/* Area tab — enrichment data */}
          <TabsContent value="area" className="mt-3 space-y-4">
            <SuburbInsights
              stats={null}
              suburb={property.suburb}
            />
            <ZoningInfo zoning={null} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
