"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, LogOut, Users, User } from "lucide-react";
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
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 font-bold text-xl text-primary hover:opacity-80 transition-opacity"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <Home className="h-5 w-5" />
            </div>
            <span className="hidden sm:inline tracking-tight">NestTogether</span>
          </Link>

          {mode && onModeChange && (
            <div className="hidden sm:block">
              <ModeSelector mode={mode} onChange={onModeChange} />
            </div>
          )}
        </div>

        {showNav && (
          <div className="flex items-center gap-3">
            {partnerName && (
              <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5">
                <div className="flex -space-x-1">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold ring-2 ring-white">
                    <User className="h-3 w-3" />
                  </div>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-chart-2 text-white text-[10px] font-bold ring-2 ring-white">
                    <User className="h-3 w-3" />
                  </div>
                </div>
                <span className="text-sm font-medium text-secondary-foreground hidden md:inline">
                  with {partnerName}
                </span>
              </div>
            )}

            {mode && onModeChange && (
              <div className="sm:hidden">
                <ModeSelector mode={mode} onChange={onModeChange} />
              </div>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground h-9 w-9 p-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
