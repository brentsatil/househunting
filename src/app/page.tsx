"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Key, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { generateInviteCode } from "@/lib/utils";
import type { SearchMode } from "@/types/property";

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<"mode" | "join">("mode");
  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSelectMode(mode: SearchMode) {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // Check if user already has a partnership
    const { data: existing } = await supabase
      .from("partnerships")
      .select("id")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .maybeSingle();

    if (existing) {
      router.push("/dashboard");
      return;
    }

    // Create new partnership
    const { error } = await supabase.from("partnerships").insert({
      user1_id: user.id,
      mode,
      invite_code: generateInviteCode(),
      status: "pending",
    });

    if (error) {
      console.error("Error creating partnership:", error);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  async function handleJoinPartnership() {
    if (!inviteCode.trim()) return;
    setLoading(true);
    setJoinError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: partnership, error } = await supabase
      .from("partnerships")
      .select("id, user2_id")
      .eq("invite_code", inviteCode.trim().toUpperCase())
      .maybeSingle();

    if (error || !partnership) {
      setJoinError("Invalid invite code. Please check and try again.");
      setLoading(false);
      return;
    }

    if (partnership.user2_id) {
      setJoinError("This partnership already has two members.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("partnerships")
      .update({ user2_id: user.id, status: "active" })
      .eq("id", partnership.id);

    if (updateError) {
      setJoinError("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-8 text-center">
        {/* Logo / Title */}
        <div className="space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Home className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">NestTogether</h1>
          <p className="text-lg text-muted-foreground">
            Find your perfect home — together.
          </p>
        </div>

        {step === "mode" && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Choose your search mode to get started.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleSelectMode("rent")}
                disabled={loading}
                className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-muted p-8 transition-all hover:border-primary hover:bg-primary/5"
              >
                <Key className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xl font-semibold">Renting</span>
                <span className="text-sm text-muted-foreground">
                  Weekly rent, bond, lease terms
                </span>
              </button>

              <button
                onClick={() => handleSelectMode("buy")}
                disabled={loading}
                className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-muted p-8 transition-all hover:border-primary hover:bg-primary/5"
              >
                <Building2 className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xl font-semibold">Buying</span>
                <span className="text-sm text-muted-foreground">
                  Sale price, auctions, strata
                </span>
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  or join your partner
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setStep("join")}
            >
              I have an invite code
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === "join" && (
          <div className="space-y-4">
            <div className="text-left">
              <Label htmlFor="inviteCode">Partner&apos;s Invite Code</Label>
              <Input
                id="inviteCode"
                placeholder="Enter 6-character code"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value.toUpperCase());
                  setJoinError(null);
                }}
                maxLength={6}
                className="mt-1 text-center text-2xl font-mono tracking-[0.5em]"
              />
              {joinError && (
                <p className="text-sm text-destructive mt-2">{joinError}</p>
              )}
            </div>

            <Button
              className="w-full"
              onClick={handleJoinPartnership}
              disabled={loading || inviteCode.length !== 6}
            >
              {loading ? "Joining..." : "Join Partnership"}
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setStep("mode")}
            >
              Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
