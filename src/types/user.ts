import type { SearchMode } from "./property";

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  mode: SearchMode;
  created_at: string;
}

export interface Partnership {
  id: string;
  user1_id: string;
  user2_id: string | null;
  invite_code: string;
  mode: SearchMode;
  status: "pending" | "active";
  created_at: string;
  user1?: Profile;
  user2?: Profile;
}
