"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeSelector } from "./ModeSelector";
import { createClient } from "@/lib/supabase/client";
import type { SearchMode } from "@/types/property";

interface HeaderProps {
  mode?: SearchMode;
  onModeChange?: (mode: SearchMode) => void;
  partnerName?: string;
  showNav?: boolean;
}

export function Header({ mode, onModeChange, partnerName, showNav = true }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 max-w-6xl">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-bold text-lg"
          >
            <Home className="h-5 w-5" />
            <span className="hidden sm:inline">NestTogether</span>
          </Link>

          {mode && onModeChange && (
            <ModeSelector mode={mode} onChange={onModeChange} />
          )}
        </div>

        {showNav && (
          <div className="flex items-center gap-2.5">
            {partnerName && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">with</span>
                <span className="font-medium">{partnerName}</span>
              </div>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSignOut}
              className="text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
