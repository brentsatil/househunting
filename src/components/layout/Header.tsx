"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, LogOut, Plus, Users } from "lucide-react";
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
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
            <Home className="h-5 w-5" />
            <span className="hidden sm:inline">NestTogether</span>
          </Link>

          {mode && onModeChange && (
            <ModeSelector mode={mode} onChange={onModeChange} />
          )}
        </div>

        {showNav && (
          <div className="flex items-center gap-2">
            {partnerName && (
              <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>with {partnerName}</span>
              </div>
            )}
            <Link href="/property/add">
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Property</span>
              </Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
