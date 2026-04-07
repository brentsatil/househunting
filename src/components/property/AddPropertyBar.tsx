"use client";

import { useState, useRef } from "react";
import { Link2, Image as ImageIcon, Loader2, Camera, X, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ExtractedProperty } from "@/types/property";

interface AddPropertyBarProps {
  onExtracted: (data: ExtractedProperty) => void;
  disabled?: boolean;
}

export function AddPropertyBar({ onExtracted, disabled }: AddPropertyBarProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<"url" | "image" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function extractFromUrl(inputUrl: string) {
    setLoading(true);
    setLoadingType("url");
    setError(null);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputUrl.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        onExtracted(result.data);
        setUrl("");
      } else if (result.partial) {
        onExtracted(result.partial);
        setUrl("");
      } else {
        setError(result.error || "Couldn't extract listing data");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  }

  async function extractFromImage(file: File) {
    setLoading(true);
    setLoadingType("image");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/extract-image", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        onExtracted(result.data);
      } else {
        setError(result.error || "Couldn't read the screenshot");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    // Check for pasted images first
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) extractFromImage(file);
          return;
        }
      }
    }

    // Otherwise handle as URL text
    const text = e.clipboardData.getData("text");
    if (text && text.startsWith("http")) {
      e.preventDefault();
      setUrl(text);
      extractFromUrl(text);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);

    const files = e.dataTransfer?.files;
    if (files?.[0] && files[0].type.startsWith("image/")) {
      extractFromImage(files[0]);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) extractFromImage(file);
    e.target.value = "";
  }

  return (
    <div
      className={`relative rounded-2xl border-2 transition-all ${
        dragActive
          ? "border-primary bg-primary/5 border-dashed"
          : error
            ? "border-destructive/30 bg-destructive/5"
            : "border-muted bg-card"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <div className="p-4 sm:p-5">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm font-medium">
                {loadingType === "image"
                  ? "Reading screenshot with AI..."
                  : "Extracting listing data..."}
              </span>
            </div>
          </div>
        )}

        {/* Drag overlay */}
        {dragActive && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl">
            <div className="flex flex-col items-center gap-2 text-primary">
              <ImageIcon className="h-10 w-10" />
              <span className="text-sm font-medium">Drop screenshot here</span>
            </div>
          </div>
        )}

        {/* Main input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Paste a listing URL or screenshot..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === "Enter" && url.trim()) extractFromUrl(url);
              }}
              className="pl-9 h-11 rounded-xl border-0 bg-muted/50 text-base"
              disabled={loading || disabled}
            />
          </div>
          <Button
            size="icon"
            variant="outline"
            className="h-11 w-11 rounded-xl shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || disabled}
            title="Upload screenshot"
          >
            <Camera className="h-5 w-5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 flex items-start gap-2 text-sm">
            <X className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
            <span className="text-destructive">{error}</span>
          </div>
        )}

        {/* Hints */}
        {!loading && !error && (
          <div className="mt-2.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Domain, REA, Facebook — or paste a screenshot
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
