"use client";

import Image from "next/image";
import Link from "next/link";
import { Bed, Bath, Car, MapPin, Calendar, Ruler } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { RatingStars } from "./RatingStars";
import { formatAUD } from "@/lib/utils";
import type { Property, PropertyInteraction, SearchMode } from "@/types/property";

interface PropertyCardProps {
  property: Property;
  interactions?: PropertyInteraction[];
  mode: SearchMode;
}

export function PropertyCard({ property, interactions = [], mode }: PropertyCardProps) {
  const leadImage = property.images?.[0];
  const priceDisplay =
    mode === "rent"
      ? property.rent_weekly
        ? `${formatAUD(property.rent_weekly)}/wk`
        : "Price TBA"
      : property.sale_price
        ? formatAUD(property.sale_price)
        : property.price_guide || "Price TBA";

  const user1Rating = interactions[0]?.rating ?? null;
  const user2Rating = interactions[1]?.rating ?? null;
  const combinedScore =
    user1Rating !== null && user2Rating !== null
      ? ((user1Rating + user2Rating) / 2).toFixed(1)
      : user1Rating !== null
        ? user1Rating.toFixed(1)
        : user2Rating !== null
          ? user2Rating.toFixed(1)
          : null;

  return (
    <Link href={`/property/${property.id}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5">
        {/* Photo */}
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {leadImage ? (
            <Image
              src={leadImage}
              alt={property.address}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <MapPin className="h-12 w-12 opacity-20" />
            </div>
          )}
          <div className="absolute top-3 left-3">
            <StatusBadge status={property.status} />
          </div>
          {property.images && property.images.length > 1 && (
            <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
              {property.images.length} photos
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          {/* Price */}
          <div className="flex items-start justify-between">
            <p className="text-xl font-bold tracking-tight">{priceDisplay}</p>
            {combinedScore && (
              <div className="flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{combinedScore}</span>
              </div>
            )}
          </div>

          {/* Address */}
          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="line-clamp-1">
              {property.address}, {property.suburb} {property.state} {property.postcode}
            </span>
          </div>

          {/* Features */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {property.bedrooms !== null && (
              <div className="flex items-center gap-1">
                <Bed className="h-4 w-4" />
                <span>{property.bedrooms}</span>
              </div>
            )}
            {property.bathrooms !== null && (
              <div className="flex items-center gap-1">
                <Bath className="h-4 w-4" />
                <span>{property.bathrooms}</span>
              </div>
            )}
            {property.parking !== null && (
              <div className="flex items-center gap-1">
                <Car className="h-4 w-4" />
                <span>{property.parking}</span>
              </div>
            )}
            {property.land_size_sqm !== null && (
              <div className="flex items-center gap-1">
                <Ruler className="h-4 w-4" />
                <span>{property.land_size_sqm}m²</span>
              </div>
            )}
          </div>

          {/* Ratings row */}
          {(user1Rating !== null || user2Rating !== null) && (
            <div className="flex items-center gap-3 pt-1 border-t">
              {user1Rating !== null && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">You</span>
                  <RatingStars rating={user1Rating} readonly size="sm" />
                </div>
              )}
              {user2Rating !== null && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Partner</span>
                  <RatingStars rating={user2Rating} readonly size="sm" />
                </div>
              )}
            </div>
          )}

          {/* Mode-specific info */}
          {mode === "rent" && property.available_date && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Available {property.available_date}</span>
            </div>
          )}
          {mode === "buy" && property.auction_date && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Auction {property.auction_date}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

function Star({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentFill" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
