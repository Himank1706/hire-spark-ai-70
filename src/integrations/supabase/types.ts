export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      certifications: {
        Row: {
          created_at: string
          id: string
          issue_date: string | null
          issuing_org: string | null
          name: string
          resume_id: string | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issue_date?: string | null
          issuing_org?: string | null
          name: string
          resume_id?: string | null
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issue_date?: string | null
          issuing_org?: string | null
          name?: string
          resume_id?: string | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certifications_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          created_at: string
          id: string
          job_id: string
          match_score: number | null
          resume_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          match_score?: number | null
          resume_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          match_score?: number | null
          resume_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          company: string
          created_at: string
          currency: string | null
          description: string
          employer_id: string | null
          experience_level: string | null
          experience_years_min: number | null
          id: string
          is_active: boolean
          location: string | null
          required_skills: Json
          salary_max: number | null
          salary_min: number | null
          source: string
          title: string
          updated_at: string
        }
        Insert: {
          company: string
          created_at?: string
          currency?: string | null
          description: string
          employer_id?: string | null
          experience_level?: string | null
          experience_years_min?: number | null
          id?: string
          is_active?: boolean
          location?: string | null
          required_skills?: Json
          salary_max?: number | null
          salary_min?: number | null
          source?: string
          title: string
          updated_at?: string
        }
        Update: {
          company?: string
          created_at?: string
          currency?: string | null
          description?: string
          employer_id?: string | null
          experience_level?: string | null
          experience_years_min?: number | null
          id?: string
          is_active?: boolean
          location?: string | null
          required_skills?: Json
          salary_max?: number | null
          salary_min?: number | null
          source?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      learning_plans: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          resume_id: string | null
          summary: string | null
          target_role: string
          total_weeks: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          resume_id?: string | null
          summary?: string | null
          target_role: string
          total_weeks?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          resume_id?: string | null
          summary?: string | null
          target_role?: string
          total_weeks?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          estimated_hours: number | null
          id: string
          is_completed: boolean
          plan_id: string
          provider: string | null
          sort_order: number
          task_type: string
          title: string
          url: string | null
          week_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          is_completed?: boolean
          plan_id: string
          provider?: string | null
          sort_order?: number
          task_type?: string
          title: string
          url?: string | null
          week_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          is_completed?: boolean
          plan_id?: string
          provider?: string | null
          sort_order?: number
          task_type?: string
          title?: string
          url?: string | null
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_tasks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "learning_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_tasks_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "plan_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_weeks: {
        Row: {
          created_at: string
          description: string | null
          focus_skills: Json
          id: string
          plan_id: string
          title: string
          week_number: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          focus_skills?: Json
          id?: string
          plan_id: string
          title: string
          week_number: number
        }
        Update: {
          created_at?: string
          description?: string | null
          focus_skills?: Json
          id?: string
          plan_id?: string
          title?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_weeks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "learning_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          headline: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          headline?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          headline?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          ats_score: number | null
          created_at: string
          education: Json | null
          experience: Json | null
          file_name: string
          file_path: string | null
          formatting_issues: Json | null
          id: string
          missing_keywords: Json | null
          raw_text: string | null
          score_breakdown: Json | null
          skills: Json | null
          strengths: Json | null
          suggestions: Json | null
          summary: string | null
          updated_at: string
          user_id: string
          weaknesses: Json | null
        }
        Insert: {
          ats_score?: number | null
          created_at?: string
          education?: Json | null
          experience?: Json | null
          file_name: string
          file_path?: string | null
          formatting_issues?: Json | null
          id?: string
          missing_keywords?: Json | null
          raw_text?: string | null
          score_breakdown?: Json | null
          skills?: Json | null
          strengths?: Json | null
          suggestions?: Json | null
          summary?: string | null
          updated_at?: string
          user_id: string
          weaknesses?: Json | null
        }
        Update: {
          ats_score?: number | null
          created_at?: string
          education?: Json | null
          experience?: Json | null
          file_name?: string
          file_path?: string | null
          formatting_issues?: Json | null
          id?: string
          missing_keywords?: Json | null
          raw_text?: string | null
          score_breakdown?: Json | null
          skills?: Json | null
          strengths?: Json | null
          suggestions?: Json | null
          summary?: string | null
          updated_at?: string
          user_id?: string
          weaknesses?: Json | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "employer" | "job_seeker"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "employer", "job_seeker"],
    },
  },
} as const
