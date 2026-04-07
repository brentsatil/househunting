"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AUSTRALIAN_STATES, PROPERTY_TYPES, PET_POLICIES } from "@/lib/constants";
import type { ExtractedProperty, SearchMode } from "@/types/property";

const propertySchema = z.object({
  address: z.string().min(1, "Address is required"),
  suburb: z.string().min(1, "Suburb is required"),
  postcode: z.string().regex(/^\d{4}$/, "Must be a 4-digit postcode"),
  state: z.string().min(1, "State is required"),
  property_type: z.string().optional(),
  bedrooms: z.coerce.number().min(0).optional(),
  bathrooms: z.coerce.number().min(0).optional(),
  parking: z.coerce.number().min(0).optional(),
  land_size_sqm: z.coerce.number().min(0).optional(),
  building_size_sqm: z.coerce.number().min(0).optional(),
  rent_weekly: z.coerce.number().min(0).optional(),
  bond: z.coerce.number().min(0).optional(),
  sale_price: z.coerce.number().min(0).optional(),
  price_guide: z.string().optional(),
  auction_date: z.string().optional(),
  strata_fees_quarterly: z.coerce.number().min(0).optional(),
  council_rates_annual: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
  agent_name: z.string().optional(),
  agent_agency: z.string().optional(),
  agent_phone: z.string().optional(),
  agent_email: z.string().email().optional().or(z.literal("")),
  lease_length: z.string().optional(),
  available_date: z.string().optional(),
  pet_policy: z.string().optional(),
  furnished: z.boolean().optional(),
  cooling_off_days: z.coerce.number().min(0).optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface PropertyFormProps {
  mode: SearchMode;
  initialData?: Partial<ExtractedProperty>;
  onSubmit: (data: PropertyFormData & { source: string; source_url?: string; images?: string[] }) => void;
  loading?: boolean;
}

export function PropertyForm({ mode, initialData, onSubmit, loading }: PropertyFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PropertyFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(propertySchema) as any,
    defaultValues: {
      address: initialData?.address || "",
      suburb: initialData?.suburb || "",
      postcode: initialData?.postcode || "",
      state: initialData?.state || "",
      property_type: initialData?.property_type || "",
      bedrooms: initialData?.bedrooms ?? undefined,
      bathrooms: initialData?.bathrooms ?? undefined,
      parking: initialData?.parking ?? undefined,
      land_size_sqm: initialData?.land_size_sqm ?? undefined,
      building_size_sqm: initialData?.building_size_sqm ?? undefined,
      rent_weekly: initialData?.rent_weekly ? initialData.rent_weekly / 100 : undefined,
      bond: initialData?.bond ? initialData.bond / 100 : undefined,
      sale_price: initialData?.sale_price ? initialData.sale_price / 100 : undefined,
      price_guide: initialData?.price_guide || "",
      auction_date: initialData?.auction_date || "",
      strata_fees_quarterly: initialData?.strata_fees_quarterly ? initialData.strata_fees_quarterly / 100 : undefined,
      council_rates_annual: initialData?.council_rates_annual ? initialData.council_rates_annual / 100 : undefined,
      description: initialData?.description || "",
      agent_name: initialData?.agent_name || "",
      agent_agency: initialData?.agent_agency || "",
      agent_phone: initialData?.agent_phone || "",
      agent_email: initialData?.agent_email || "",
      lease_length: initialData?.lease_length || "",
      available_date: initialData?.available_date || "",
      pet_policy: initialData?.pet_policy || "",
      furnished: initialData?.furnished || false,
      cooling_off_days: initialData?.cooling_off_days ?? undefined,
    },
  });

  function handleFormSubmit(data: PropertyFormData) {
    // Convert dollar amounts to cents
    const processed = {
      ...data,
      rent_weekly: data.rent_weekly ? data.rent_weekly * 100 : undefined,
      bond: data.bond ? data.bond * 100 : undefined,
      sale_price: data.sale_price ? data.sale_price * 100 : undefined,
      strata_fees_quarterly: data.strata_fees_quarterly ? data.strata_fees_quarterly * 100 : undefined,
      council_rates_annual: data.council_rates_annual ? data.council_rates_annual * 100 : undefined,
      source: initialData?.source || "manual",
      source_url: initialData?.source_url,
      images: initialData?.images,
    };
    onSubmit(processed);
  }

  const missingFields = initialData?.missing_fields || [];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {missingFields.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Some fields couldn&apos;t be extracted automatically. Please fill in the highlighted fields below.
        </div>
      )}

      {/* Location */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">Location</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="address">Street Address *</Label>
            <Input
              id="address"
              {...register("address")}
              className={missingFields.includes("address") ? "border-amber-400" : ""}
            />
            {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
          </div>
          <div>
            <Label htmlFor="suburb">Suburb *</Label>
            <Input
              id="suburb"
              {...register("suburb")}
              className={missingFields.includes("suburb") ? "border-amber-400" : ""}
            />
            {errors.suburb && <p className="text-sm text-destructive mt-1">{errors.suburb.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="state">State *</Label>
              <Select
                defaultValue={initialData?.state}
                onValueChange={(val) => setValue("state", val)}
              >
                <SelectTrigger className={missingFields.includes("state") ? "border-amber-400" : ""}>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {AUSTRALIAN_STATES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && <p className="text-sm text-destructive mt-1">{errors.state.message}</p>}
            </div>
            <div>
              <Label htmlFor="postcode">Postcode *</Label>
              <Input
                id="postcode"
                {...register("postcode")}
                className={missingFields.includes("postcode") ? "border-amber-400" : ""}
              />
              {errors.postcode && <p className="text-sm text-destructive mt-1">{errors.postcode.message}</p>}
            </div>
          </div>
        </div>
      </fieldset>

      {/* Property Details */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">Property Details</legend>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <Label htmlFor="property_type">Type</Label>
            <Select
              defaultValue={initialData?.property_type}
              onValueChange={(val) => setValue("property_type", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="bedrooms">Beds</Label>
            <Input id="bedrooms" type="number" min="0" {...register("bedrooms")} />
          </div>
          <div>
            <Label htmlFor="bathrooms">Baths</Label>
            <Input id="bathrooms" type="number" min="0" {...register("bathrooms")} />
          </div>
          <div>
            <Label htmlFor="parking">Parking</Label>
            <Input id="parking" type="number" min="0" {...register("parking")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="land_size_sqm">Land Size (m²)</Label>
            <Input id="land_size_sqm" type="number" min="0" {...register("land_size_sqm")} />
          </div>
          <div>
            <Label htmlFor="building_size_sqm">Building Size (m²)</Label>
            <Input id="building_size_sqm" type="number" min="0" {...register("building_size_sqm")} />
          </div>
        </div>
      </fieldset>

      {/* Pricing */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">
          {mode === "rent" ? "Rental Pricing" : "Sale Pricing"}
        </legend>
        {mode === "rent" ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rent_weekly">Rent ($/week)</Label>
              <Input id="rent_weekly" type="number" min="0" step="1" {...register("rent_weekly")} />
            </div>
            <div>
              <Label htmlFor="bond">Bond ($)</Label>
              <Input id="bond" type="number" min="0" step="1" {...register("bond")} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="sale_price">Price ($)</Label>
              <Input id="sale_price" type="number" min="0" step="1" {...register("sale_price")} />
            </div>
            <div>
              <Label htmlFor="price_guide">Price Guide</Label>
              <Input id="price_guide" placeholder="e.g., Auction $800k-$880k" {...register("price_guide")} />
            </div>
            <div>
              <Label htmlFor="auction_date">Auction Date</Label>
              <Input id="auction_date" type="date" {...register("auction_date")} />
            </div>
            <div>
              <Label htmlFor="strata_fees_quarterly">Strata Fees ($/quarter)</Label>
              <Input id="strata_fees_quarterly" type="number" min="0" {...register("strata_fees_quarterly")} />
            </div>
            <div>
              <Label htmlFor="council_rates_annual">Council Rates ($/year)</Label>
              <Input id="council_rates_annual" type="number" min="0" {...register("council_rates_annual")} />
            </div>
            <div>
              <Label htmlFor="cooling_off_days">Cooling Off (days)</Label>
              <Input id="cooling_off_days" type="number" min="0" {...register("cooling_off_days")} />
            </div>
          </div>
        )}
      </fieldset>

      {/* Rental-specific fields */}
      {mode === "rent" && (
        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold">Lease Details</legend>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="lease_length">Lease Length</Label>
              <Input id="lease_length" placeholder="e.g., 12 months" {...register("lease_length")} />
            </div>
            <div>
              <Label htmlFor="available_date">Available From</Label>
              <Input id="available_date" type="date" {...register("available_date")} />
            </div>
            <div>
              <Label htmlFor="pet_policy">Pet Policy</Label>
              <Select
                defaultValue={initialData?.pet_policy}
                onValueChange={(val) => setValue("pet_policy", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {PET_POLICIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="furnished"
              {...register("furnished")}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="furnished">Furnished</Label>
          </div>
        </fieldset>
      )}

      {/* Agent Details */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">Agent Details</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="agent_name">Agent Name</Label>
            <Input id="agent_name" {...register("agent_name")} />
          </div>
          <div>
            <Label htmlFor="agent_agency">Agency</Label>
            <Input id="agent_agency" {...register("agent_agency")} />
          </div>
          <div>
            <Label htmlFor="agent_phone">Phone</Label>
            <Input id="agent_phone" type="tel" {...register("agent_phone")} />
          </div>
          <div>
            <Label htmlFor="agent_email">Email</Label>
            <Input id="agent_email" type="email" {...register("agent_email")} />
          </div>
        </div>
      </fieldset>

      {/* Description */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold">Description</legend>
        <Textarea
          id="description"
          rows={4}
          placeholder="Property description..."
          {...register("description")}
        />
      </fieldset>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Saving..." : "Save Property"}
      </Button>
    </form>
  );
}
