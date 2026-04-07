"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Comment } from "@/types/property";

export function useRealtimeComments(propertyId: string | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchComments = useCallback(async () => {
    if (!propertyId) return;

    const { data, error } = await supabase
      .from("comments")
      .select(
        `
        *,
        user:profiles(full_name, avatar_url)
      `
      )
      .eq("property_id", propertyId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
      return;
    }

    setComments(data || []);
    setLoading(false);
  }, [propertyId, supabase]);

  useEffect(() => {
    fetchComments();

    if (!propertyId) return;

    const channel = supabase
      .channel(`comments-${propertyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `property_id=eq.${propertyId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propertyId, fetchComments, supabase]);

  async function addComment(content: string, userId: string) {
    if (!propertyId) return;

    const { error } = await supabase.from("comments").insert({
      property_id: propertyId,
      user_id: userId,
      content,
    });

    if (error) throw error;
  }

  return { comments, loading, addComment };
}
