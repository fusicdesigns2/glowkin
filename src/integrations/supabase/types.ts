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
      chat_images: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          image_url: string
          message_id: string
          prompt: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          image_url: string
          message_id: string
          prompt: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string
          message_id?: string
          prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_images_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          "10x_cost": number
          content: string
          created_at: string | null
          credit_cost: number
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          predicted_cost: number | null
          role: string
          thread_id: string | null
        }
        Insert: {
          "10x_cost"?: number
          content: string
          created_at?: string | null
          credit_cost?: number
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
          predicted_cost?: number | null
          role: string
          thread_id?: string | null
        }
        Update: {
          "10x_cost"?: number
          content?: string
          created_at?: string | null
          credit_cost?: number
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          predicted_cost?: number | null
          role?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      model_costs: {
        Row: {
          active: boolean
          date: string
          id: string
          in_cost: number
          markup: number
          model: string
          out_cost: number
          PerUnit: string | null
          predicted_avg_in_words: number | null
          predicted_avg_out_words: number | null
          predicted_cost: number | null
          prediction_date: string | null
        }
        Insert: {
          active?: boolean
          date?: string
          id?: string
          in_cost: number
          markup: number
          model: string
          out_cost: number
          PerUnit?: string | null
          predicted_avg_in_words?: number | null
          predicted_avg_out_words?: number | null
          predicted_cost?: number | null
          prediction_date?: string | null
        }
        Update: {
          active?: boolean
          date?: string
          id?: string
          in_cost?: number
          markup?: number
          model?: string
          out_cost?: number
          PerUnit?: string | null
          predicted_avg_in_words?: number | null
          predicted_avg_out_words?: number | null
          predicted_cost?: number | null
          prediction_date?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number
          id: string
          updated_at: string
          username: string | null
          whisper_consent: boolean | null
          whisper_consent_date: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          id: string
          updated_at?: string
          username?: string | null
          whisper_consent?: boolean | null
          whisper_consent_date?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          id?: string
          updated_at?: string
          username?: string | null
          whisper_consent?: boolean | null
          whisper_consent_date?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
