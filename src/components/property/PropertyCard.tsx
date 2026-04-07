"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bed, Bath, Car, MapPin, Calendar, Ruler, Clock, MessageSquare,
} from "lucide-react";
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

export function PropertyCard({
  property,
  interactions = [],
  mode,
}: PropertyCardProps) {
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
      <Card className="group overflow-hidden rounded-2xl transition-all hover:shadow-lg hover:-translate-y-0.5 bg-card">
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
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <MapPin className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}

          {/* Status badge - top left */}
          <div className="absolute top-2.5 left-2.5">
            <StatusBadge status={property.status} />
          </div>

          {/* Combined score - top right */}
          {combinedScore && (
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm px-2 py-0.5 text-white">
              <StarIcon className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-semibold">{combinedScore}</span>
            </div>
          )}

          {/* Photo count */}
          {property.images && property.images.length > 1 && (
            <div className="absolute bottom-2.5 right-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">
              {property.images.length}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3.5 space-y-1.5">
          {/* Price + source */}
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold tracking-tight">{priceDisplay}</p>
            {property.source !== "manual" && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium">
                {property.source}
              </span>
            )}
          </div>

          {/* Address */}
          <p className="text-sm text-muted-foreground line-clamp-1">
            {property.address}, {property.suburb}
          </p>

          {/* Features row */}
          <div className="flex items-center gap-3.5 text-sm text-muted-foreground pt-0.5">
            {property.bedrooms !== null && (
              <span className="flex items-center gap-1">
                <Bed className="h-3.5 w-3.5" />
                {property.bedrooms}
              </span>
            )}
            {property.bathrooms !== null && (
              <span className="flex items-center gap-1">
                <Bath className="h-3.5 w-3.5" />
                {property.bathrooms}
              </span>
            )}
            {property.parking !== null && (
              <span className="flex items-center gap-1">
                <Car className="h-3.5 w-3.5" />
                {property.parking}
              </span>
            )}
            {property.land_size_sqm !== null && (
              <span className="flex items-center gap-1">
                <Ruler className="h-3.5 w-3.5" />
                {property.land_size_sqm}m²
              </span>
            )}
          </div>

          {/* Partner ratings row */}
          {(user1Rating !== null || user2Rating !== null) && (
            <div className="flex items-center gap-4 pt-1.5 border-t border-muted">
              {user1Rating !== null && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">You</span>
                  <RatingStars rating={user1Rating} readonly size="sm" />
                </div>
              )}
              {user2Rating !== null && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">Partner</span>
                  <RatingStars rating={user2Rating} readonly size="sm" />
                </div>
              )}
            </div>
          )}

          {/* Action hints — inspection time or key date */}
          {(property.status === "inspection_booked" ||
            (mode === "rent" && property.available_date) ||
            (mode === "buy" && property.auction_date)) && (
            <div className="flex items-center gap-1.5 pt-1.5 border-t border-muted text-xs">
              {property.status === "inspection_booked" ? (
                <>
                  <Clock className="h-3 w-3 text-amber-500" />
                  <span className="text-amber-700 font-medium">Inspection booked</span>
                </>
              ) : mode === "buy" && property.auction_date ? (
                <>
                  <Calendar className="h-3 w-3 text-orange-500" />
                  <span className="text-orange-700">Auction {property.auction_date}</span>
                </>
              ) : mode === "rent" && property.available_date ? (
                <>
                  <Calendar className="h-3 w-3 text-blue-500" />
                  <span className="text-blue-700">Available {property.available_date}</span>
                </>
              ) : null}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentFill"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
