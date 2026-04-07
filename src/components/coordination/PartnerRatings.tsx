"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RatingStars } from "@/components/property/RatingStars";
import type { PropertyInteraction } from "@/types/property";

interface PartnerRatingsProps {
  interactions: PropertyInteraction[];
  currentUserId: string;
  onRatingChange: (rating: number) => void;
  user1Name?: string;
  user2Name?: string;
}

export function PartnerRatings({
  interactions,
  currentUserId,
  onRatingChange,
  user1Name = "You",
  user2Name = "Partner",
}: PartnerRatingsProps) {
  const myInteraction = interactions.find((i) => i.user_id === currentUserId);
  const partnerInteraction = interactions.find((i) => i.user_id !== currentUserId);

  const combined =
    myInteraction?.rating && partnerInteraction?.rating
      ? (myInteraction.rating + partnerInteraction.rating) / 2
      : myInteraction?.rating || partnerInteraction?.rating || null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          Ratings
          {combined !== null && (
            <span className="text-sm font-normal text-muted-foreground">
              Combined: {combined.toFixed(1)} / 5
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">{user1Name}</p>
            <RatingStars
              rating={myInteraction?.rating ?? null}
              onChange={onRatingChange}
            />
            {myInteraction?.pros && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">Pros</p>
                <p className="text-sm">{myInteraction.pros}</p>
              </div>
            )}
            {myInteraction?.cons && (
              <div className="mt-1">
                <p className="text-xs text-muted-foreground">Cons</p>
                <p className="text-sm">{myInteraction.cons}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{user2Name}</p>
            <RatingStars
              rating={partnerInteraction?.rating ?? null}
              readonly
            />
            {partnerInteraction?.pros && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">Pros</p>
                <p className="text-sm">{partnerInteraction.pros}</p>
              </div>
            )}
            {partnerInteraction?.cons && (
              <div className="mt-1">
                <p className="text-xs text-muted-foreground">Cons</p>
                <p className="text-sm">{partnerInteraction.cons}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
