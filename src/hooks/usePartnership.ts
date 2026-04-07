"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Partnership } from "@/types/user";
import type { SearchMode } from "@/types/property";

export function usePartnership() {
  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchPartnership = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data } = await supabase
      .from("partnerships")
      .select(
        `
        *,
        user1:profiles!partnerships_user1_id_fkey(full_name, avatar_url),
        user2:profiles!partnerships_user2_id_fkey(full_name, avatar_url)
      `
      )
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .single();

    setPartnership(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchPartnership();
  }, [fetchPartnership]);

  const partnerName =
    partnership && userId
      ? userId === partnership.user1_id
        ? (partnership.user2 as { full_name: string } | null)?.full_name
        : (partnership.user1 as { full_name: string } | null)?.full_name
      : undefined;

  async function updateMode(mode: SearchMode) {
    if (!partnership) return;
    await supabase.from("partnerships").update({ mode }).eq("id", partnership.id);
    setPartnership({ ...partnership, mode });
  }

  return {
    partnership,
    userId,
    loading,
    partnerName,
    mode: partnership?.mode as SearchMode | undefined,
    updateMode,
    refresh: fetchPartnership,
  };
}
