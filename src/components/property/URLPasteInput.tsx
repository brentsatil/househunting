"use client";

import { useState } from "react";
import { Link2, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ExtractedProperty } from "@/types/property";

interface URLPasteInputProps {
  onExtracted: (data: ExtractedProperty) => void;
  onManualEntry: () => void;
}

export function URLPasteInput({ onExtracted, onManualEntry }: URLPasteInputProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExtract() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        onExtracted(result.data);
        setUrl("");
      } else if (result.partial) {
        // Partial extraction — show what we got + let user fill in the rest
        onExtracted(result.partial);
        setUrl("");
      } else {
        setError(result.error || "Failed to extract listing data");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text");
    if (pasted && pasted.startsWith("http")) {
      setUrl(pasted);
      // Auto-extract on paste
      setTimeout(() => {
        setUrl(pasted);
        handleExtractWithUrl(pasted);
      }, 100);
    }
  }

  async function handleExtractWithUrl(pastedUrl: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: pastedUrl.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        onExtracted(result.data);
        setUrl("");
      } else if (result.partial) {
        onExtracted(result.partial);
        setUrl("");
      } else {
        setError(result.error || "Failed to extract listing data");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Paste a Domain, REA, or Facebook listing URL..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            onPaste={handlePaste}
            onKeyDown={(e) => e.key === "Enter" && handleExtract()}
            className="pl-9"
            disabled={loading}
          />
        </div>
        <Button onClick={handleExtract} disabled={loading || !url.trim()}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Extracting...
            </>
          ) : (
            "Extract"
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
          <button
            onClick={onManualEntry}
            className="underline hover:no-underline ml-1"
          >
            Add manually instead
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Supports Domain.com.au, realestate.com.au, and Facebook Marketplace. Or{" "}
        <button onClick={onManualEntry} className="underline hover:no-underline">
          add manually
        </button>
        .
      </p>
    </div>
  );
}
