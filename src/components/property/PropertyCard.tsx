"use client";

import Image from "next/image";
import Link from "next/link";
import { Bed, Bath, Car, MapPin, Calendar, Ruler, Clock, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { RatingStars } from "./RatingStars";
import { formatAUD } from "@/lib/utils";
import type { Property, PropertyInteraction, SearchMode } from "@/types/property";

interface PropertyCardProps {
  property: Property;
  interactions?: PropertyInteraction[];
  mode: SearchMode;
  compareMode?: boolean;
  isSelected?: boolean;
  onToggleCompare?: (id: string) => void;
}

export function PropertyCard({
  property,
  interactions = [],
  mode,
  compareMode,
  isSelected,
  onToggleCompare,
}: PropertyCardProps) {
  const leadImage = property.images?.[0];
  const priceDisplay = mode === "rent"
    ? property.rent_weekly ? `${formatAUD(property.rent_weekly)}/wk` : "Price TBA"
    : property.sale_price ? formatAUD(property.sale_price)
      : property.price_guide || "Price TBA";

  const user1Rating = interactions[0]?.rating ?? null;
  const user2Rating = interactions[1]?.rating ?? null;
  const combinedScore = user1Rating !== null && user2Rating !== null
    ? ((user1Rating + user2Rating) / 2).toFixed(1)
    : user1Rating !== null ? user1Rating.toFixed(1)
      : user2Rating !== null ? user2Rating.toFixed(1) : null;

  const riskLevel = property.ai_red_flags?.overall_risk;

  const cardContent = (
      <Card className={`group overflow-hidden rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card border-border/50 ${compareMode && isSelected ? "ring-2 ring-primary" : ""}`}>
        {/* Photo */}
        <div className="relative aspect-[3/2] overflow-hidden bg-muted">
          {leadImage ? (
            <Image
              src={leadImage} alt={property.address} fill unoptimized
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
              <MapPin className="h-12 w-12 text-muted-foreground/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <StatusBadge status={property.status} />
            {riskLevel && riskLevel !== "low" && (
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold backdrop-blur-sm ${
                riskLevel === "high"
                  ? "bg-red-500/80 text-white"
                  : "bg-amber-500/80 text-white"
              }`}>
                <ShieldAlert className="h-3 w-3" />
                {riskLevel}
              </span>
            )}
          </div>

          {compareMode && (
            <div className="absolute top-3 right-3 z-10">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                isSelected
                  ? "bg-primary border-primary text-white"
                  : "bg-white/80 border-white/60 backdrop-blur-sm"
              }`}>
                {isSelected && <CheckCircle2 className="h-4 w-4" />}
              </div>
            </div>
          )}

          {combinedScore && (
            <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-sm px-2.5 py-1 text-white">
              <StarIcon className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-bold">{combinedScore}</span>
            </div>
          )}

          {property.images && property.images.length > 1 && (
            <div className="absolute bottom-3 right-3 rounded-full bg-black/50 backdrop-blur-sm px-2.5 py-1 text-[11px] font-medium text-white">
              {property.images.length} photos
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xl font-bold tracking-tight text-foreground">{priceDisplay}</p>
            {property.source !== "manual" && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold bg-muted px-2 py-0.5 rounded-full">
                {property.source}
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-1 font-medium">
            {property.address}, {property.suburb} {property.state}
          </p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {property.bedrooms !== null && (
              <span className="flex items-center gap-1.5"><Bed className="h-4 w-4" />{property.bedrooms}</span>
            )}
            {property.bathrooms !== null && (
              <span className="flex items-center gap-1.5"><Bath className="h-4 w-4" />{property.bathrooms}</span>
            )}
            {property.parking !== null && (
              <span className="flex items-center gap-1.5"><Car className="h-4 w-4" />{property.parking}</span>
            )}
            {property.land_size_sqm !== null && (
              <span className="flex items-center gap-1.5"><Ruler className="h-4 w-4" />{property.land_size_sqm}m²</span>
            )}
          </div>

          {(user1Rating !== null || user2Rating !== null) && (
            <div className="flex items-center gap-4 pt-2 border-t">
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

          {(property.status === "inspection_booked" ||
            (mode === "buy" && property.auction_date) ||
            (mode === "rent" && property.available_date)) && (
            <div className="flex items-center gap-2 pt-2 border-t text-xs font-medium">
              {property.status === "inspection_booked" ? (
                <><Clock className="h-3.5 w-3.5 text-amber-500" /><span className="text-amber-700">Inspection booked</span></>
              ) : mode === "buy" && property.auction_date ? (
                <><Calendar className="h-3.5 w-3.5 text-orange-500" /><span className="text-orange-700">Auction {property.auction_date}</span></>
              ) : mode === "rent" && property.available_date ? (
                <><Calendar className="h-3.5 w-3.5 text-blue-500" /><span className="text-blue-700">Available {property.available_date}</span></>
              ) : null}
            </div>
          )}
        </div>
      </Card>
  );

  if (compareMode) {
    return (
      <button
        onClick={() => onToggleCompare?.(property.id)}
        className="text-left w-full"
      >
        {cardContent}
      </button>
    );
  }

  return <Link href={`/property/${property.id}`}>{cardContent}</Link>;
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentFill" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
