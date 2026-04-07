"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Bed, Bath, Car, MapPin, Calendar, Ruler, ExternalLink,
  Phone, Mail, Building2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "./StatusBadge";
import { RatingStars } from "./RatingStars";
import { formatAUD } from "@/lib/utils";
import type { Property, PropertyInteraction, SearchMode } from "@/types/property";

interface PropertyDetailProps {
  property: Property;
  interactions: PropertyInteraction[];
  mode: SearchMode;
  currentUserId: string;
  onRatingChange: (rating: number) => void;
  onStatusChange: (status: Property["status"]) => void;
}

export function PropertyDetail({
  property,
  interactions,
  mode,
  currentUserId,
  onRatingChange,
  onStatusChange,
}: PropertyDetailProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const images = property.images || [];
  const myInteraction = interactions.find((i) => i.user_id === currentUserId);
  const partnerInteraction = interactions.find((i) => i.user_id !== currentUserId);

  const priceDisplay =
    mode === "rent"
      ? property.rent_weekly
        ? `${formatAUD(property.rent_weekly)}/wk`
        : "Price TBA"
      : property.sale_price
        ? formatAUD(property.sale_price)
        : property.price_guide || "Price TBA";

  return (
    <div className="space-y-6">
      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted">
          <Image
            src={images[currentImage]}
            alt={`${property.address} - Photo ${currentImage + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 80vw"
            priority
          />
          {images.length > 1 && (
            <>
              <button
                onClick={() => setCurrentImage((prev) => (prev - 1 + images.length) % images.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentImage((prev) => (prev + 1) % images.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                {currentImage + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrentImage(i)}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-md ${
                i === currentImage ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={img} alt="" fill className="object-cover" sizes="96px" />
            </button>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold sm:text-3xl">{priceDisplay}</h1>
            <StatusBadge status={property.status} />
          </div>
          <div className="flex items-start gap-1.5 text-muted-foreground">
            <MapPin className="h-5 w-5 shrink-0 mt-0.5" />
            <span className="text-lg">
              {property.address}, {property.suburb} {property.state} {property.postcode}
            </span>
          </div>
        </div>
        {property.source_url && (
          <a
            href={property.source_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4" />
              View Original
            </Button>
          </a>
        )}
      </div>

      {/* Features row */}
      <div className="flex flex-wrap gap-6 text-lg">
        {property.bedrooms !== null && (
          <div className="flex items-center gap-2">
            <Bed className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{property.bedrooms}</span>
            <span className="text-muted-foreground text-sm">Beds</span>
          </div>
        )}
        {property.bathrooms !== null && (
          <div className="flex items-center gap-2">
            <Bath className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{property.bathrooms}</span>
            <span className="text-muted-foreground text-sm">Baths</span>
          </div>
        )}
        {property.parking !== null && (
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{property.parking}</span>
            <span className="text-muted-foreground text-sm">Cars</span>
          </div>
        )}
        {property.land_size_sqm !== null && (
          <div className="flex items-center gap-2">
            <Ruler className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{property.land_size_sqm}m²</span>
            <span className="text-muted-foreground text-sm">Land</span>
          </div>
        )}
        {property.property_type && (
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium capitalize">{property.property_type}</span>
          </div>
        )}
      </div>

      {/* Ratings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Ratings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Your Rating</p>
              <RatingStars rating={myInteraction?.rating ?? null} onChange={onRatingChange} />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Partner&apos;s Rating</p>
              <RatingStars rating={partnerInteraction?.rating ?? null} readonly />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Details, Description, Agent */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="agent">Agent</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {mode === "rent" && (
                  <>
                    {property.bond !== null && (
                      <div>
                        <dt className="text-muted-foreground">Bond</dt>
                        <dd className="font-medium">{formatAUD(property.bond!)}</dd>
                      </div>
                    )}
                    {property.lease_length && (
                      <div>
                        <dt className="text-muted-foreground">Lease Length</dt>
                        <dd className="font-medium">{property.lease_length}</dd>
                      </div>
                    )}
                    {property.available_date && (
                      <div>
                        <dt className="text-muted-foreground">Available From</dt>
                        <dd className="font-medium">{property.available_date}</dd>
                      </div>
                    )}
                    {property.pet_policy && (
                      <div>
                        <dt className="text-muted-foreground">Pet Policy</dt>
                        <dd className="font-medium capitalize">{property.pet_policy.replace("_", " ")}</dd>
                      </div>
                    )}
                    {property.furnished && (
                      <div>
                        <dt className="text-muted-foreground">Furnished</dt>
                        <dd className="font-medium">Yes</dd>
                      </div>
                    )}
                  </>
                )}
                {mode === "buy" && (
                  <>
                    {property.auction_date && (
                      <div>
                        <dt className="text-muted-foreground">Auction Date</dt>
                        <dd className="font-medium flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {property.auction_date}
                        </dd>
                      </div>
                    )}
                    {property.strata_fees_quarterly !== null && (
                      <div>
                        <dt className="text-muted-foreground">Strata (Quarterly)</dt>
                        <dd className="font-medium">{formatAUD(property.strata_fees_quarterly!)}</dd>
                      </div>
                    )}
                    {property.council_rates_annual !== null && (
                      <div>
                        <dt className="text-muted-foreground">Council Rates (Annual)</dt>
                        <dd className="font-medium">{formatAUD(property.council_rates_annual!)}</dd>
                      </div>
                    )}
                    {property.cooling_off_days !== null && (
                      <div>
                        <dt className="text-muted-foreground">Cooling Off</dt>
                        <dd className="font-medium">{property.cooling_off_days} days</dd>
                      </div>
                    )}
                  </>
                )}
                {property.listed_date && (
                  <div>
                    <dt className="text-muted-foreground">Listed</dt>
                    <dd className="font-medium">{property.listed_date}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="description" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {property.description ? (
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {property.description}
                </div>
              ) : (
                <p className="text-muted-foreground">No description available.</p>
              )}
              {property.ai_summary && (
                <div className="mt-4 rounded-lg bg-muted p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">AI Summary</p>
                  <p className="text-sm">{property.ai_summary}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agent" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              {property.agent_name && (
                <p className="font-medium">{property.agent_name}</p>
              )}
              {property.agent_agency && (
                <p className="text-sm text-muted-foreground">{property.agent_agency}</p>
              )}
              {property.agent_phone && (
                <a
                  href={`tel:${property.agent_phone}`}
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {property.agent_phone}
                </a>
              )}
              {property.agent_email && (
                <a
                  href={`mailto:${property.agent_email}`}
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {property.agent_email}
                </a>
              )}
              {!property.agent_name && !property.agent_phone && (
                <p className="text-muted-foreground">No agent details available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Update Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(
              [
                "interested",
                "inspection_booked",
                "inspected",
                "applied",
                "offer_made",
                "passed",
                "won",
                "lost",
              ] as const
            ).map((status) => (
              <button
                key={status}
                onClick={() => onStatusChange(status)}
                className={`transition ${property.status === status ? "scale-105" : "opacity-60 hover:opacity-100"}`}
              >
                <StatusBadge status={status} />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
