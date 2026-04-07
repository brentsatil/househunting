"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect to dashboard — property adding now happens inline on the dashboard.
 * Keeping this route so existing links don't 404.
 */
export default function AddPropertyPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Redirecting...</div>
    </div>
  );
}
