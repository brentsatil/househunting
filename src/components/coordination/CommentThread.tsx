"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Comment } from "@/types/property";

interface CommentThreadProps {
  comments: Comment[];
  currentUserId: string;
  onAddComment: (content: string) => void;
}

export function CommentThread({ comments, currentUserId, onAddComment }: CommentThreadProps) {
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!newComment.trim()) return;
    setSending(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment("");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Discussion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments list */}
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet. Start the conversation!
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {comments.map((comment) => {
              const isMe = comment.user_id === currentUserId;
              return (
                <div
                  key={comment.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                  >
                    {!isMe && comment.user && (
                      <p className="text-xs font-medium mb-0.5 opacity-70">
                        {comment.user.full_name}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    <p className={`text-xs mt-1 ${isMe ? "opacity-70" : "text-muted-foreground"}`}>
                      {new Date(comment.created_at).toLocaleTimeString("en-AU", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            className="min-h-[40px] resize-none"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={sending || !newComment.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
