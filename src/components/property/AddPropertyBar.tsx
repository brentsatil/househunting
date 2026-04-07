"use client";

import { useState, useRef } from "react";
import { Link2, Loader2, Camera, X, Sparkles, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HtmlPasteDialog } from "./HtmlPasteDialog";
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

  // HTML paste dialog state (shown when rate-limited)
  const [pasteDialog, setPasteDialog] = useState<{
    url: string;
    partial?: ExtractedProperty;
  } | null>(null);

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
      } else if (result.needs_html) {
        // Rate-limited or fetch failed — offer HTML paste fallback
        setPasteDialog({ url: inputUrl.trim(), partial: result.partial });
        setUrl("");
      } else if (result.partial) {
        // Partial extraction — show preview with what we got
        onExtracted(result.partial);
        setUrl("");
      } else if (response.status >= 500) {
        // Server error — offer HTML paste as fallback
        setPasteDialog({ url: inputUrl.trim() });
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
    if (files?.[0] && files[0].type.startsWith("image/"))
      extractFromImage(files[0]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) extractFromImage(file);
    e.target.value = "";
  }

  return (
    <>
      <div
        className={`relative rounded-2xl transition-all duration-200 ${
          dragActive
            ? "border-2 border-dashed border-primary bg-primary/5 shadow-lg shadow-primary/10"
            : error
              ? "border-2 border-destructive/20 bg-destructive/5"
              : "border-2 border-border bg-card shadow-sm hover:shadow-md"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <div className="p-5 sm:p-6">
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-card/90 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                </div>
                <span className="text-sm font-medium text-foreground">
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
              <div className="flex flex-col items-center gap-3 text-primary">
                <Upload className="h-12 w-12" />
                <span className="text-base font-semibold">
                  Drop screenshot here
                </span>
              </div>
            </div>
          )}

          {/* Main input row */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
                className="pl-11 h-12 rounded-xl border-border bg-background text-base"
                disabled={loading || disabled}
              />
            </div>
            <Button
              size="icon"
              variant="secondary"
              className="h-12 w-12 rounded-xl shrink-0 shadow-sm"
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
            <div className="mt-3 flex items-start gap-2 text-sm bg-destructive/10 rounded-xl px-4 py-2.5">
              <X className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
              <span className="text-destructive">{error}</span>
            </div>
          )}

          {/* Hints */}
          {!loading && !error && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary/60" />
              <span>
                Supports <strong>Domain.com.au</strong>,{" "}
                <strong>realestate.com.au</strong>,{" "}
                <strong>Facebook Marketplace</strong> — or paste/drop a
                screenshot
              </span>
            </div>
          )}
        </div>
      </div>

      {/* HTML paste dialog for rate-limited extractions */}
      {pasteDialog && (
        <HtmlPasteDialog
          open
          onClose={() => setPasteDialog(null)}
          url={pasteDialog.url}
          partialData={pasteDialog.partial}
          onExtracted={(data) => {
            onExtracted(data);
            setPasteDialog(null);
          }}
        />
      )}
    </>
  );
}
