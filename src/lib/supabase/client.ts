import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  // During build/SSR without env vars, return a placeholder client
  // that will be replaced on the client side
  client = createBrowserClient(
    url || "https://placeholder.supabase.co",
    key || "placeholder-key"
  );

  return client;
}
