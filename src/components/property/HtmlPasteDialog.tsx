"use client";

import { useState } from "react";
import { Code2, ClipboardPaste, X, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { ExtractedProperty } from "@/types/property";

interface HtmlPasteDialogProps {
  open: boolean;
  onClose: () => void;
  url: string;
  partialData?: ExtractedProperty;
  onExtracted: (data: ExtractedProperty) => void;
}

export function HtmlPasteDialog({
  open,
  onClose,
  url,
  partialData,
  onExtracted,
}: HtmlPasteDialogProps) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!html.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, html: html.trim() }),
      });
      const result = await response.json();
      if (result.success) {
        onExtracted(result.data);
        setHtml("");
        onClose();
      } else {
        setError(result.error || "Couldn't extract data from the pasted HTML");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  function handleUsePartial() {
    if (partialData) {
      onExtracted(partialData);
      onClose();
    }
  }

  const hostname = (() => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return "the listing site";
    }
  })();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            Paste page source
          </DialogTitle>
          <DialogDescription>
            {hostname} is blocking automated requests. You can paste the page
            HTML directly from your browser instead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <div className="rounded-xl bg-muted/50 p-3.5 text-sm space-y-2">
            <p className="font-medium">How to get the page source:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
              <li>
                Open the listing in your browser:{" "}
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline break-all"
                >
                  {url.length > 60 ? url.slice(0, 60) + "..." : url}
                </a>
              </li>
              <li>
                Right-click anywhere on the page and select{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[11px] font-mono">
                  View Page Source
                </kbd>
              </li>
              <li>
                Select all (
                <kbd className="px-1 py-0.5 rounded bg-muted border text-[11px] font-mono">
                  Ctrl+A
                </kbd>
                ), copy (
                <kbd className="px-1 py-0.5 rounded bg-muted border text-[11px] font-mono">
                  Ctrl+C
                </kbd>
                ), and paste below
              </li>
            </ol>
          </div>

          {/* Paste area */}
          <div className="relative">
            <Textarea
              placeholder="Paste the page HTML here..."
              value={html}
              onChange={(e) => {
                setHtml(e.target.value);
                setError(null);
              }}
              rows={6}
              className="resize-none font-mono text-xs"
              disabled={loading}
            />
            {!html && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <ClipboardPaste className="h-8 w-8 text-muted-foreground/20" />
              </div>
            )}
          </div>

          {html && (
            <p className="text-xs text-muted-foreground">
              {html.length.toLocaleString()} characters pasted
            </p>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm bg-destructive/10 rounded-xl px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
              <span className="text-destructive">{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <div>
              {partialData && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUsePartial}
                  className="text-xs text-muted-foreground"
                >
                  Use partial data instead
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !html.trim()}
                className="gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  "Extract data"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
