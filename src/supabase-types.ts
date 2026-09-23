/* Generated-shape placeholder. Replace with `supabase gen types typescript` after applying migrations. */
export type Database = { public: { Tables: {
  profiles: { Row: { id: string; display_name: string | null; tier: "free" | "premium"; created_at: string } };
  projects: { Row: { id: string; owner_id: string; title: string; timezone: string; revision: number; archived_at: string | null; created_at: string; updated_at: string } };
  project_members: { Row: { project_id: string; user_id: string; role: "owner" | "editor"; accepted_at: string } };
  project_invitations: { Row: { id: string; project_id: string; invitee_email: string; role: "editor"; accepted_at: string | null; revoked_at: string | null } };
  screenplay_drafts: { Row: { id: string; project_id: string; title: string; revision: number } };
  screenplay_blocks: { Row: { id: string; project_id: string; draft_id: string; kind: string; content: unknown; ordinal: number; revision: number } };
  scenes: { Row: { id: string; project_id: string; draft_id: string | null; heading: string; display_number: number } };
  shots: { Row: { id: string; project_id: string; scene_id: string | null; ordinal: number; archived_at: string | null } };
  storyboard_frames: { Row: { id: string; project_id: string; shot_id: string | null; ordinal: number; archived_at: string | null } };
}; Functions: { create_project_limited: { Args: { p_title: string; p_timezone: string }; Returns: string } } } };
