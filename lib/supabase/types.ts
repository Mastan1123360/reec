/**
 * lib/supabase/types.ts
 *
 * Full database TypeScript schema representation for Supabase RLS and PostgREST calls.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_progress: {
        Row: {
          id: string;
          user_id: string;
          completed_lessons: string[];
          completed_blocks: string[];
          bookmarks: string[];
          notes: Record<string, string>;
          checklist: Record<string, boolean>;
          last_visited: string | null;
          study_time_minutes: number;
          daily_minutes: Record<string, number>;
          active_dates: string[];
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          completed_lessons?: string[];
          completed_blocks?: string[];
          bookmarks?: string[];
          notes?: Record<string, string>;
          checklist?: Record<string, boolean>;
          last_visited?: string | null;
          study_time_minutes?: number;
          daily_minutes?: Record<string, number>;
          active_dates?: string[];
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          completed_lessons?: string[];
          completed_blocks?: string[];
          bookmarks?: string[];
          notes?: Record<string, string>;
          checklist?: Record<string, boolean>;
          last_visited?: string | null;
          study_time_minutes?: number;
          daily_minutes?: Record<string, number>;
          active_dates?: string[];
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_activity_logs: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          subtitle: string | null;
          timestamp: number;
          path: string | null;
          icon_type: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          user_id?: string;
          type: string;
          title: string;
          subtitle?: string | null;
          timestamp: number;
          path?: string | null;
          icon_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          subtitle?: string | null;
          timestamp?: number;
          path?: string | null;
          icon_type?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_projects: {
        Row: {
          id: string;
          user_id: string;
          phase: number;
          title: string;
          tagline: string | null;
          description: string;
          difficulty: string;
          estimated_hours: number;
          tech_stack: string[];
          milestones: Json;
          starter_code: string;
          architecture_highlights: string[];
          created_at: string;
          version: number;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id?: string;
          phase: number;
          title: string;
          tagline?: string | null;
          description: string;
          difficulty: string;
          estimated_hours?: number;
          tech_stack?: string[];
          milestones?: Json;
          starter_code?: string;
          architecture_highlights?: string[];
          created_at?: string;
          version?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          phase?: number;
          title?: string;
          tagline?: string | null;
          description?: string;
          difficulty?: string;
          estimated_hours?: number;
          tech_stack?: string[];
          milestones?: Json;
          starter_code?: string;
          architecture_highlights?: string[];
          created_at?: string;
          version?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_hidden_lessons: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          slug: string;
          title: string;
          subtitle: string | null;
          description: string | null;
          badge: string | null;
          tags: string[];
          status: string;
          unlocked_at: number;
          opened_at: number | null;
          trigger_source: string | null;
          trigger_execution_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          lesson_id: string;
          slug: string;
          title: string;
          subtitle?: string | null;
          description?: string | null;
          badge?: string | null;
          tags?: string[];
          status?: string;
          unlocked_at: number;
          opened_at?: number | null;
          trigger_source?: string | null;
          trigger_execution_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          slug?: string;
          title?: string;
          subtitle?: string | null;
          description?: string | null;
          badge?: string | null;
          tags?: string[];
          status?: string;
          unlocked_at?: number;
          opened_at?: number | null;
          trigger_source?: string | null;
          trigger_execution_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_workspace_files: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          content: string;
          file_created_at: number;
          file_updated_at: number;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id?: string;
          name: string;
          content?: string;
          file_created_at: number;
          file_updated_at: number;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          content?: string;
          file_created_at?: number;
          file_updated_at?: number;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      content_files: {
        Row: {
          id: string;
          lesson_id: string;
          path: string;
          slug: string;
          filename: string;
          content: string;
          content_type: string;
          phase: number;
          week: number | null;
          day: number | null;
          title: string;
          subtitle: string | null;
          version: number;
          content_hash: string;
          is_published: boolean;
          is_hidden: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
          uploaded_at: string;
        };
        Insert: {
          id: string;
          lesson_id: string;
          path: string;
          slug: string;
          filename: string;
          content: string;
          content_type?: string;
          phase: number;
          week?: number | null;
          day?: number | null;
          title: string;
          subtitle?: string | null;
          version?: number;
          content_hash: string;
          is_published?: boolean;
          is_hidden?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          path?: string;
          slug?: string;
          filename?: string;
          content?: string;
          content_type?: string;
          phase?: number;
          week?: number | null;
          day?: number | null;
          title?: string;
          subtitle?: string | null;
          version?: number;
          content_hash?: string;
          is_published?: boolean;
          is_hidden?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
          uploaded_at?: string;
        };
        Relationships: [];
      };
      content_file_versions: {
        Row: {
          id: string;
          content_file_id: string;
          lesson_id: string;
          version: number;
          content: string;
          content_hash: string;
          change_summary: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          content_file_id: string;
          lesson_id: string;
          version: number;
          content: string;
          content_hash: string;
          change_summary?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          content_file_id?: string;
          lesson_id?: string;
          version?: number;
          content?: string;
          content_hash?: string;
          change_summary?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_file_versions_content_file_id_fkey";
            columns: ["content_file_id"];
            isOneToOne: false;
            referencedRelation: "content_files";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
