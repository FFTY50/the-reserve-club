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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          activation_key: string | null
          created_at: string | null
          id: string
          last_activity: string | null
          member_since: string
          pours_balance: number
          qr_code_url: string | null
          signed_up_by_staff_id: string | null
          status: Database["public"]["Enums"]["customer_status"]
          tier: Database["public"]["Enums"]["customer_tier"]
          total_pours_lifetime: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activation_key?: string | null
          created_at?: string | null
          id?: string
          last_activity?: string | null
          member_since?: string
          pours_balance?: number
          qr_code_url?: string | null
          signed_up_by_staff_id?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          tier?: Database["public"]["Enums"]["customer_tier"]
          total_pours_lifetime?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activation_key?: string | null
          created_at?: string | null
          id?: string
          last_activity?: string | null
          member_since?: string
          pours_balance?: number
          qr_code_url?: string | null
          signed_up_by_staff_id?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          tier?: Database["public"]["Enums"]["customer_tier"]
          total_pours_lifetime?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_signed_up_by_staff_id_fkey"
            columns: ["signed_up_by_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_applications: {
        Row: {
          created_at: string | null
          current_step: number | null
          id: string
          is_complete: boolean | null
          notes: string | null
          preferences: Json
          reviewed_at: string | null
          reviewed_by_staff_id: string | null
          selected_tier: Database["public"]["Enums"]["customer_tier"] | null
          status: string
          stripe_session_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_step?: number | null
          id?: string
          is_complete?: boolean | null
          notes?: string | null
          preferences: Json
          reviewed_at?: string | null
          reviewed_by_staff_id?: string | null
          selected_tier?: Database["public"]["Enums"]["customer_tier"] | null
          status?: string
          stripe_session_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_step?: number | null
          id?: string
          is_complete?: boolean | null
          notes?: string | null
          preferences?: Json
          reviewed_at?: string | null
          reviewed_by_staff_id?: string | null
          selected_tier?: Database["public"]["Enums"]["customer_tier"] | null
          status?: string
          stripe_session_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          billing_period_end: string | null
          billing_period_start: string | null
          created_at: string | null
          customer_id: string
          id: string
          monthly_price: number
          notes: string | null
          recorded_by_staff_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["membership_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["customer_tier"]
          toast_reference_number: string
          updated_at: string | null
        }
        Insert: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          monthly_price: number
          notes?: string | null
          recorded_by_staff_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["membership_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier: Database["public"]["Enums"]["customer_tier"]
          toast_reference_number: string
          updated_at?: string | null
        }
        Update: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          monthly_price?: number
          notes?: string | null
          recorded_by_staff_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["membership_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["customer_tier"]
          toast_reference_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_recorded_by_staff_id_fkey"
            columns: ["recorded_by_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pours: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          location: Database["public"]["Enums"]["location_type"]
          notes: string | null
          quantity: number
          recorded_by_staff_id: string | null
          status: Database["public"]["Enums"]["pour_status"]
          toast_reference_number: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          location: Database["public"]["Enums"]["location_type"]
          notes?: string | null
          quantity?: number
          recorded_by_staff_id?: string | null
          status?: Database["public"]["Enums"]["pour_status"]
          toast_reference_number: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          location?: Database["public"]["Enums"]["location_type"]
          notes?: string | null
          quantity?: number
          recorded_by_staff_id?: string | null
          status?: Database["public"]["Enums"]["pour_status"]
          toast_reference_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pours_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pours_recorded_by_staff_id_fkey"
            columns: ["recorded_by_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          last_name: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          is_active?: boolean | null
          last_login?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tier_definitions: {
        Row: {
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          monthly_pours: number
          monthly_price: number
          stripe_price_id: string | null
          tier_name: Database["public"]["Enums"]["customer_tier"]
        }
        Insert: {
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          monthly_pours: number
          monthly_price: number
          stripe_price_id?: string | null
          tier_name: Database["public"]["Enums"]["customer_tier"]
        }
        Update: {
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          monthly_pours?: number
          monthly_price?: number
          stripe_price_id?: string | null
          tier_name?: Database["public"]["Enums"]["customer_tier"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      get_available_pours: { Args: { customer_uuid: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "customer" | "staff"
      customer_status: "active" | "inactive" | "suspended"
      customer_tier: "select" | "premier" | "elite" | "household"
      location_type: "main_bar" | "tasting_room" | "private_event"
      membership_status: "active" | "expired" | "cancelled"
      pour_status: "redeemed" | "pending" | "reversed"
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
      app_role: ["customer", "staff"],
      customer_status: ["active", "inactive", "suspended"],
      customer_tier: ["select", "premier", "elite", "household"],
      location_type: ["main_bar", "tasting_room", "private_event"],
      membership_status: ["active", "expired", "cancelled"],
      pour_status: ["redeemed", "pending", "reversed"],
    },
  },
} as const
