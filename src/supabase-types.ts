export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      actors: {
        Row: {
          id: string
          name: string
          project_id: string
        }
        Insert: {
          id?: string
          name: string
          project_id: string
        }
        Update: {
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "actors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          project_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: never
          project_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: never
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sheet_versions: {
        Row: {
          id: string
          project_id: string
          published_at: string | null
          snapshot: Json
          version: number
        }
        Insert: {
          id?: string
          project_id: string
          published_at?: string | null
          snapshot: Json
          version: number
        }
        Update: {
          id?: string
          project_id?: string
          published_at?: string | null
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "call_sheet_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      character_actors: {
        Row: {
          actor_id: string
          character_id: string
        }
        Insert: {
          actor_id: string
          character_id: string
        }
        Update: {
          actor_id?: string
          character_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_actors_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_actors_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          id: string
          name: string
          project_id: string
        }
        Insert: {
          id?: string
          name: string
          project_id: string
        }
        Update: {
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          details: Json
          id: string
          name: string
          project_id: string
        }
        Insert: {
          details?: Json
          id?: string
          name: string
          project_id: string
        }
        Update: {
          details?: Json
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          bytes: number
          checksum: string
          content_type: string
          created_at: string
          id: string
          project_id: string
          storage_path: string
        }
        Insert: {
          bytes: number
          checksum: string
          content_type: string
          created_at?: string
          id?: string
          project_id: string
          storage_path: string
        }
        Update: {
          bytes?: number
          checksum?: string
          content_type?: string
          created_at?: string
          id?: string
          project_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: Json
          id: string
          project_id: string
          revision: number
          title: string
        }
        Insert: {
          content?: Json
          id?: string
          project_id: string
          revision?: number
          title: string
        }
        Update: {
          content?: Json
          id?: string
          project_id?: string
          revision?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_identity: {
        Row: {
          created_at: string
          singleton: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          singleton?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          singleton?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_identity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          tier: Database["public"]["Enums"]["plan_tier"]
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          tier?: Database["public"]["Enums"]["plan_tier"]
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          tier?: Database["public"]["Enums"]["plan_tier"]
        }
        Relationships: []
      }
      project_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_by: string
          invitee_email: string
          project_id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["member_role"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_by: string
          invitee_email: string
          project_id: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["member_role"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_by?: string
          invitee_email?: string
          project_id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["member_role"]
        }
        Relationships: [
          {
            foreignKeyName: "project_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          accepted_at: string
          project_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          accepted_at?: string
          project_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          accepted_at?: string
          project_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          owner_id: string
          revision: number
          timezone: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          owner_id: string
          revision?: number
          timezone: string
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          revision?: number
          timezone?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scenes: {
        Row: {
          display_number: number
          draft_id: string | null
          heading: string
          id: string
          project_id: string
        }
        Insert: {
          display_number: number
          draft_id?: string | null
          heading: string
          id?: string
          project_id: string
        }
        Update: {
          display_number?: number
          draft_id?: string | null
          heading?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenes_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "screenplay_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_entries: {
        Row: {
          ends_at: string | null
          id: string
          project_id: string
          scene_id: string | null
          shoot_day_id: string
          starts_at: string | null
        }
        Insert: {
          ends_at?: string | null
          id?: string
          project_id: string
          scene_id?: string | null
          shoot_day_id: string
          starts_at?: string | null
        }
        Update: {
          ends_at?: string | null
          id?: string
          project_id?: string
          scene_id?: string | null
          shoot_day_id?: string
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_entries_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_entries_shoot_day_id_fkey"
            columns: ["shoot_day_id"]
            isOneToOne: false
            referencedRelation: "shoot_days"
            referencedColumns: ["id"]
          },
        ]
      }
      screenplay_blocks: {
        Row: {
          content: Json
          draft_id: string
          id: string
          kind: string
          ordinal: number
          project_id: string
          revision: number
        }
        Insert: {
          content?: Json
          draft_id: string
          id?: string
          kind: string
          ordinal: number
          project_id: string
          revision?: number
        }
        Update: {
          content?: Json
          draft_id?: string
          id?: string
          kind?: string
          ordinal?: number
          project_id?: string
          revision?: number
        }
        Relationships: [
          {
            foreignKeyName: "screenplay_blocks_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "screenplay_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenplay_blocks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      screenplay_comments: {
        Row: {
          anchor: Json
          block_id: string
          body: string
          created_at: string
          id: string
          project_id: string
          resolved_at: string | null
        }
        Insert: {
          anchor: Json
          block_id: string
          body: string
          created_at?: string
          id?: string
          project_id: string
          resolved_at?: string | null
        }
        Update: {
          anchor?: Json
          block_id?: string
          body?: string
          created_at?: string
          id?: string
          project_id?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screenplay_comments_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "screenplay_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screenplay_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      screenplay_drafts: {
        Row: {
          created_at: string
          id: string
          project_id: string
          revision: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          revision?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          revision?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "screenplay_drafts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      shoot_days: {
        Row: {
          id: string
          project_id: string
          shooting_date: string
        }
        Insert: {
          id?: string
          project_id: string
          shooting_date: string
        }
        Update: {
          id?: string
          project_id?: string
          shooting_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "shoot_days_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      shots: {
        Row: {
          archived_at: string | null
          id: string
          ordinal: number
          project_id: string
          scene_id: string | null
        }
        Insert: {
          archived_at?: string | null
          id?: string
          ordinal: number
          project_id: string
          scene_id?: string | null
        }
        Update: {
          archived_at?: string | null
          id?: string
          ordinal?: number
          project_id?: string
          scene_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shots_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      storyboard_frames: {
        Row: {
          archived_at: string | null
          id: string
          media_id: string | null
          ordinal: number
          project_id: string
          shot_id: string | null
        }
        Insert: {
          archived_at?: string | null
          id?: string
          media_id?: string | null
          ordinal: number
          project_id: string
          shot_id?: string | null
        }
        Update: {
          archived_at?: string | null
          id?: string
          media_id?: string | null
          ordinal?: number
          project_id?: string
          shot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storyboard_frames_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storyboard_frames_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storyboard_frames_shot_id_fkey"
            columns: ["shot_id"]
            isOneToOne: false
            referencedRelation: "shots"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_project_invitation: {
        Args: { p_invitation: string }
        Returns: string
      }
      add_editor_limited: { Args: { p: string; u: string }; Returns: undefined }
      assert_project_ref: {
        Args: { child_project: string; p: string }
        Returns: boolean
      }
      create_project_limited: {
        Args: { p_timezone: string; p_title: string }
        Returns: string
      }
      invite_editor: {
        Args: { p_email: string; p_project: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_project: { Args: { p_project: string }; Returns: boolean }
      is_member: { Args: { p: string }; Returns: boolean }
      is_owner: { Args: { p: string }; Returns: boolean }
      provision_owner: { Args: { target: string }; Returns: undefined }
      remove_editor: {
        Args: { p_project: string; p_user: string }
        Returns: undefined
      }
      rename_project: {
        Args: {
          p_expected_revision: number
          p_project: string
          p_title: string
        }
        Returns: {
          archived_at: string | null
          created_at: string
          id: string
          owner_id: string
          revision: number
          timezone: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "projects"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      member_role: "owner" | "editor"
      plan_tier: "free" | "premium"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      member_role: ["owner", "editor"],
      plan_tier: ["free", "premium"],
    },
  },
} as const
