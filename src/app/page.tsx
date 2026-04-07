"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Key, Building2, ArrowRight, MapPin, Users, Star, Shield } from "lucide-react";
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: existing } = await supabase
      .from("partnerships").select("id")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .maybeSingle();
    if (existing) { router.push("/dashboard"); return; }

    await supabase.from("partnerships").insert({
      user1_id: user.id, mode, invite_code: generateInviteCode(), status: "pending",
    });
    router.push("/dashboard");
  }

  async function handleJoinPartnership() {
    if (!inviteCode.trim()) return;
    setLoading(true);
    setJoinError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: partnership } = await supabase
      .from("partnerships").select("id, user2_id")
      .eq("invite_code", inviteCode.trim().toUpperCase())
      .maybeSingle();

    if (!partnership) { setJoinError("Invalid invite code."); setLoading(false); return; }
    if (partnership.user2_id) { setJoinError("Partnership already has two members."); setLoading(false); return; }

    await supabase.from("partnerships")
      .update({ user2_id: user.id, status: "active" })
      .eq("id", partnership.id);
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — Hero panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-hero-gradient relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Home className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">NestTogether</span>
          </div>

          <div className="max-w-lg space-y-8">
            <h1 className="text-5xl xl:text-6xl font-bold leading-[1.1] tracking-tight">
              Find your perfect home — together.
            </h1>
            <p className="text-xl text-white/80 leading-relaxed">
              The shared property search app for couples navigating the Australian market.
              Paste listings, compare side-by-side, plan inspections, and decide together.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              {[
                { icon: MapPin, text: "Domain, REA & Facebook" },
                { icon: Users, text: "Real-time partner sync" },
                { icon: Star, text: "Rate & compare together" },
                { icon: Shield, text: "Private & secure" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-white/90">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-white/50">Built for the Australian property market</p>
        </div>

        {/* Decorative shapes */}
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute bottom-20 right-20 h-40 w-40 rounded-full bg-white/5" />
      </div>

      {/* Right — Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <Home className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">NestTogether</h1>
            <p className="text-muted-foreground">Find your perfect home — together.</p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Get started</h2>
            <p className="text-muted-foreground">Choose your search mode or join your partner.</p>
          </div>

          {step === "mode" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleSelectMode("rent")}
                  disabled={loading}
                  className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-border bg-card p-6 sm:p-8 transition-all hover:border-primary hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Key className="h-7 w-7" />
                  </div>
                  <span className="text-lg font-semibold">Renting</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Weekly rent, bond, lease terms
                  </span>
                </button>

                <button
                  onClick={() => handleSelectMode("buy")}
                  disabled={loading}
                  className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-border bg-card p-6 sm:p-8 transition-all hover:border-primary hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Building2 className="h-7 w-7" />
                  </div>
                  <span className="text-lg font-semibold">Buying</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Sale price, auctions, strata
                  </span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-3 text-muted-foreground">
                    or join your partner
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full h-12 text-base"
                onClick={() => setStep("join")}
              >
                I have an invite code
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {step === "join" && (
            <div className="space-y-5">
              <div>
                <Label htmlFor="inviteCode" className="text-base">Partner&apos;s Invite Code</Label>
                <Input
                  id="inviteCode"
                  placeholder="XXXXXX"
                  value={inviteCode}
                  onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setJoinError(null); }}
                  maxLength={6}
                  className="mt-2 text-center text-3xl font-mono tracking-[0.5em] h-16"
                />
                {joinError && <p className="text-sm text-destructive mt-2">{joinError}</p>}
              </div>
              <Button
                className="w-full h-12 text-base"
                onClick={handleJoinPartnership}
                disabled={loading || inviteCode.length !== 6}
              >
                {loading ? "Joining..." : "Join Partnership"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep("mode")}>
                Back
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
