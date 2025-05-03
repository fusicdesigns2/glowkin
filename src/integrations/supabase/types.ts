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
          charged_amount: number | null
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
          charged_amount?: number | null
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
          charged_amount?: number | null
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
      chat_summaries: {
        Row: {
          "10x_cost": number | null
          assistant_message_id: string
          charged_amount: number | null
          chunk_index: number | null
          created_at: string
          credit_cost: number | null
          id: string
          input_tokens: number | null
          model: string
          output_tokens: number | null
          predicted_cost: number | null
          summary: string
          thread_id: string
          total_chunks: number | null
          user_message_id: string
        }
        Insert: {
          "10x_cost"?: number | null
          assistant_message_id: string
          charged_amount?: number | null
          chunk_index?: number | null
          created_at?: string
          credit_cost?: number | null
          id?: string
          input_tokens?: number | null
          model: string
          output_tokens?: number | null
          predicted_cost?: number | null
          summary: string
          thread_id: string
          total_chunks?: number | null
          user_message_id: string
        }
        Update: {
          "10x_cost"?: number | null
          assistant_message_id?: string
          charged_amount?: number | null
          chunk_index?: number | null
          created_at?: string
          credit_cost?: number | null
          id?: string
          input_tokens?: number | null
          model?: string
          output_tokens?: number | null
          predicted_cost?: number | null
          summary?: string
          thread_id?: string
          total_chunks?: number | null
          user_message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_summaries_assistant_message_id_fkey"
            columns: ["assistant_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_summaries_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_summaries_user_message_id_fkey"
            columns: ["user_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string | null
          hidden: boolean | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hidden?: boolean | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          hidden?: boolean | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      failed_summaries: {
        Row: {
          assistant_message_id: string
          attempt_count: number | null
          chunk_index: number
          created_at: string
          error_message: string | null
          id: string
          last_attempt: string | null
          thread_id: string
          total_chunks: number
          user_message_id: string
        }
        Insert: {
          assistant_message_id: string
          attempt_count?: number | null
          chunk_index: number
          created_at?: string
          error_message?: string | null
          id?: string
          last_attempt?: string | null
          thread_id: string
          total_chunks: number
          user_message_id: string
        }
        Update: {
          assistant_message_id?: string
          attempt_count?: number | null
          chunk_index?: number
          created_at?: string
          error_message?: string | null
          id?: string
          last_attempt?: string | null
          thread_id?: string
          total_chunks?: number
          user_message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "failed_summaries_assistant_message_id_fkey"
            columns: ["assistant_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "failed_summaries_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "failed_summaries_user_message_id_fkey"
            columns: ["user_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
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
      summaries: {
        Row: {
          chat_message_id: string
          created_at: string | null
          id: number
          summary_text: string
          thread_id: string
          updated_at: string | null
        }
        Insert: {
          chat_message_id: string
          created_at?: string | null
          id?: number
          summary_text: string
          thread_id: string
          updated_at?: string | null
        }
        Update: {
          chat_message_id?: string
          created_at?: string | null
          id?: number
          summary_text?: string
          thread_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "summaries_chat_message_id_fkey"
            columns: ["chat_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "summaries_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: { role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      insert_chat_summary: {
        Args: {
          p_thread_id: string
          p_user_message_id: string
          p_assistant_message_id: string
          p_summary: string
          p_model: string
          p_chunk_index: number
          p_total_chunks: number
          p_input_tokens: number
          p_output_tokens: number
          p_charged_amount: number
        }
        Returns: {
          "10x_cost": number | null
          assistant_message_id: string
          charged_amount: number | null
          chunk_index: number | null
          created_at: string
          credit_cost: number | null
          id: string
          input_tokens: number | null
          model: string
          output_tokens: number | null
          predicted_cost: number | null
          summary: string
          thread_id: string
          total_chunks: number | null
          user_message_id: string
        }[]
      }
    }
    Enums: {
      app_role: "SuperAdmin" | "User"
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
    Enums: {
      app_role: ["SuperAdmin", "User"],
    },
  },
} as const
