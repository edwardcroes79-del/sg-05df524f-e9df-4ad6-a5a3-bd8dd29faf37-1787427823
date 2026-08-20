/* eslint-disable @typescript-eslint/no-empty-object-type */
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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      api_rate_limits: {
        Row: {
          action: string
          attempts: number
          created_at: string
          id: string
          rate_key: string
          updated_at: string
          window_start: string
        }
        Insert: {
          action: string
          attempts?: number
          created_at?: string
          id?: string
          rate_key: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          action?: string
          attempts?: number
          created_at?: string
          id?: string
          rate_key?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      business_users: {
        Row: {
          business_id: string | null
          created_at: string | null
          id: string
          role: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_users_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          business_name: string
          cover_image: string | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          logo: string | null
          owner_id: string
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          slug: string
          social_links: Json | null
          status: string | null
          subscription_plan: string | null
          subscription_status: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          business_name: string
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          logo?: string | null
          owner_id: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          social_links?: Json | null
          status?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          logo?: string | null
          owner_id?: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          social_links?: Json | null
          status?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      customer_loyalty_cards: {
        Row: {
          business_id: string | null
          created_at: string | null
          current_stamps: number | null
          customer_id: string | null
          id: string
          loyalty_program_id: string | null
          rewards_earned: number | null
          status: string | null
          total_stamps: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          current_stamps?: number | null
          customer_id?: string | null
          id?: string
          loyalty_program_id?: string | null
          rewards_earned?: number | null
          status?: string | null
          total_stamps?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          current_stamps?: number | null
          customer_id?: string | null
          id?: string
          loyalty_program_id?: string | null
          rewards_earned?: number | null
          status?: string | null
          total_stamps?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_loyalty_cards_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_loyalty_cards_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_loyalty_cards_loyalty_program_id_fkey"
            columns: ["loyalty_program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          avatar: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          user_id: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          user_id: string
        }
        Update: {
          avatar?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      loyalty_programs: {
        Row: {
          active: boolean | null
          bg_color: string | null
          business_id: string | null
          card_bg_image_url: string | null
          card_color: string | null
          card_logo_url: string | null
          card_template: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          primary_color: string | null
          reward_description: string | null
          reward_icon: string | null
          reward_image: string | null
          reward_title: string
          secondary_color: string | null
          stamp_icon: string | null
          stamp_target: number
          template_id: string | null
          text_color: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          bg_color?: string | null
          business_id?: string | null
          card_bg_image_url?: string | null
          card_color?: string | null
          card_logo_url?: string | null
          card_template?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          primary_color?: string | null
          reward_description?: string | null
          reward_icon?: string | null
          reward_image?: string | null
          reward_title: string
          secondary_color?: string | null
          stamp_icon?: string | null
          stamp_target?: number
          template_id?: string | null
          text_color?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          bg_color?: string | null
          business_id?: string | null
          card_bg_image_url?: string | null
          card_color?: string | null
          card_logo_url?: string | null
          card_template?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          primary_color?: string | null
          reward_description?: string | null
          reward_icon?: string | null
          reward_image?: string | null
          reward_title?: string
          secondary_color?: string | null
          stamp_icon?: string | null
          stamp_target?: number
          template_id?: string | null
          text_color?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_programs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          business_id: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          id: string
          metadata: Json | null
          payment_type: string | null
          provider: string
          provider_transaction_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          business_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          metadata?: Json | null
          payment_type?: string | null
          provider: string
          provider_transaction_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          business_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          metadata?: Json | null
          payment_type?: string | null
          provider?: string
          provider_transaction_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_bank_accounts: {
        Row: {
          account_holder: string
          account_number: string
          bank_name: string
          created_at: string | null
          currency: string
          id: string
          instructions: string | null
          is_active: boolean | null
        }
        Insert: {
          account_holder: string
          account_number: string
          bank_name: string
          created_at?: string | null
          currency?: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
        }
        Update: {
          account_holder?: string
          account_number?: string
          bank_name?: string
          created_at?: string | null
          currency?: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_super_admin: boolean
          role: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_super_admin?: boolean
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_super_admin?: boolean
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      qr_codes: {
        Row: {
          active: boolean | null
          business_id: string | null
          code: string
          created_at: string | null
          id: string
          loyalty_program_id: string | null
          type: string
        }
        Insert: {
          active?: boolean | null
          business_id?: string | null
          code: string
          created_at?: string | null
          id?: string
          loyalty_program_id?: string | null
          type: string
        }
        Update: {
          active?: boolean | null
          business_id?: string | null
          code?: string
          created_at?: string | null
          id?: string
          loyalty_program_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_codes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_loyalty_program_id_fkey"
            columns: ["loyalty_program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          business_id: string | null
          customer_id: string | null
          earned_at: string | null
          expires_at: string | null
          id: string
          loyalty_program_id: string | null
          redeemed_at: string | null
          redeemed_by: string | null
          reward_code: string
          reward_title: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          customer_id?: string | null
          earned_at?: string | null
          expires_at?: string | null
          id?: string
          loyalty_program_id?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          reward_code: string
          reward_title: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          customer_id?: string | null
          earned_at?: string | null
          expires_at?: string | null
          id?: string
          loyalty_program_id?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          reward_code?: string
          reward_title?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_loyalty_program_id_fkey"
            columns: ["loyalty_program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      stamp_transactions: {
        Row: {
          business_id: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          loyalty_card_id: string | null
          loyalty_program_id: string | null
          staff_user_id: string | null
          stamp_number: number
          stamp_type: string | null
          verification_method: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          loyalty_card_id?: string | null
          loyalty_program_id?: string | null
          staff_user_id?: string | null
          stamp_number: number
          stamp_type?: string | null
          verification_method?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          loyalty_card_id?: string | null
          loyalty_program_id?: string | null
          staff_user_id?: string | null
          stamp_number?: number
          stamp_type?: string | null
          verification_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stamp_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stamp_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stamp_transactions_loyalty_card_id_fkey"
            columns: ["loyalty_card_id"]
            isOneToOne: false
            referencedRelation: "customer_loyalty_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stamp_transactions_loyalty_program_id_fkey"
            columns: ["loyalty_program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          admin_notes: string | null
          amount: number
          business_id: string | null
          created_at: string | null
          currency: string | null
          external_transaction_id: string | null
          id: string
          metadata: Json | null
          paid_at: string | null
          payment_proof_url: string | null
          payment_reference: string | null
          plan_id: string | null
          provider: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          business_id?: string | null
          created_at?: string | null
          currency?: string | null
          external_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          plan_id?: string | null
          provider: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          business_id?: string | null
          created_at?: string | null
          currency?: string | null
          external_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          plan_id?: string | null
          provider?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          features: string[]
          id: string
          includes_premium_templates: boolean | null
          is_active: boolean | null
          is_trial: boolean | null
          max_customers: number
          max_loyalty_programs: number
          max_staff: number
          name: string
          price_awg: number
          trial_days: number | null
        }
        Insert: {
          created_at?: string | null
          features?: string[]
          id: string
          includes_premium_templates?: boolean | null
          is_active?: boolean | null
          is_trial?: boolean | null
          max_customers?: number
          max_loyalty_programs?: number
          max_staff?: number
          name: string
          price_awg?: number
          trial_days?: number | null
        }
        Update: {
          created_at?: string | null
          features?: string[]
          id?: string
          includes_premium_templates?: boolean | null
          is_active?: boolean | null
          is_trial?: boolean | null
          max_customers?: number
          max_loyalty_programs?: number
          max_staff?: number
          name?: string
          price_awg?: number
          trial_days?: number | null
        }
        Relationships: []
      }
      website_pages: {
        Row: {
          content: string | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      website_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_business:
        | { Args: { p_business_id: string }; Returns: boolean }
        | {
            Args: { p_business_id: string; p_user_id?: string }
            Returns: boolean
          }
      can_access_customer:
        | { Args: { p_customer_id: string }; Returns: boolean }
        | {
            Args: { p_customer_id: string; p_user_id?: string }
            Returns: boolean
          }
      check_and_increment_rate_limit: {
        Args: {
          p_action: string
          p_max_attempts: number
          p_rate_key: string
          p_window_seconds: number
        }
        Returns: boolean
      }
      check_business_ownership: {
        Args: { b_id: string; u_id: string }
        Returns: boolean
      }
      is_active_staff_of: {
        Args: { p_business_id: string; p_user_id: string }
        Returns: boolean
      }
      is_business_operator:
        | { Args: { p_business_id: string }; Returns: boolean }
        | {
            Args: { p_business_id: string; p_user_id?: string }
            Returns: boolean
          }
      is_super_admin_user: { Args: { p_user_id?: string }; Returns: boolean }
      issue_stamp: {
        Args: {
          p_business_id: string
          p_customer_id: string
          p_loyalty_program_id: string
        }
        Returns: Json
      }
      issue_stamp_tx: {
        Args: {
          p_business_id: string
          p_customer_id: string
          p_loyalty_program_id: string
        }
        Returns: Json
      }
      redeem_reward: {
        Args: { p_business_id: string; p_reward_code: string }
        Returns: Json
      }
      redeem_reward_tx: {
        Args: { p_business_id: string; p_reward_code: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
