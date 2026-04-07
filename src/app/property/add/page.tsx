"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { PropertyForm } from "@/components/property/PropertyForm";
import { URLPasteInput } from "@/components/property/URLPasteInput";
import { usePartnership } from "@/hooks/usePartnership";
import { useProperties } from "@/hooks/useProperties";
import type { ExtractedProperty } from "@/types/property";

function AddPropertyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { partnership, mode, updateMode, partnerName } = usePartnership();
  const { addProperty } = useProperties(partnership?.id ?? null);

  // Check if we have pre-extracted data from URL
  const dataParam = searchParams.get("data");
  const [extractedData, setExtractedData] = useState<ExtractedProperty | null>(
    dataParam ? JSON.parse(dataParam) : null
  );
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(!!dataParam);

  if (!mode) {
    return (
      <div className="min-h-screen">
        <Header showNav={false} />
        <div className="container px-4 py-16 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  async function handleSubmit(data: Record<string, unknown>) {
    setSaving(true);
    try {
      const property = await addProperty({
        ...data,
        status: "interested",
        is_active: true,
      } as Record<string, unknown>);

      router.push(`/property/${property.id}`);
    } catch (error) {
      console.error("Error saving property:", error);
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header
        mode={mode}
        onModeChange={updateMode}
        partnerName={partnerName ?? undefined}
      />

      <main className="container max-w-2xl px-4 py-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div>
          <h1 className="text-2xl font-bold">Add Property</h1>
          <p className="text-muted-foreground mt-1">
            Paste a listing URL to auto-fill details, or add manually.
          </p>
        </div>

        {!showForm && (
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-6">
              <h2 className="text-lg font-semibold mb-3">From URL</h2>
              <URLPasteInput
                onExtracted={(data) => {
                  setExtractedData(data);
                  setShowForm(true);
                }}
                onManualEntry={() => setShowForm(true)}
              />
            </div>

            <div className="text-center">
              <Button variant="outline" onClick={() => setShowForm(true)}>
                Or add manually
              </Button>
            </div>
          </div>
        )}

        {showForm && (
          <div className="rounded-xl border bg-card p-6">
            {extractedData?.missing_fields && extractedData.missing_fields.length > 0 && (
              <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                Some fields couldn&apos;t be extracted. Please complete the highlighted fields.
              </div>
            )}
            <PropertyForm
              mode={mode}
              initialData={extractedData ?? undefined}
              onSubmit={handleSubmit}
              loading={saving}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default function AddPropertyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <AddPropertyContent />
    </Suspense>
  );
}
