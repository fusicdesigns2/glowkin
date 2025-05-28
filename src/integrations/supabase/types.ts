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
          key_info: Json | null
          model: string
          output_tokens: number
          predicted_cost: number | null
          role: string
          summary: string | null
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
          key_info?: Json | null
          model: string
          output_tokens?: number
          predicted_cost?: number | null
          role: string
          summary?: string | null
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
          key_info?: Json | null
          model?: string
          output_tokens?: number
          predicted_cost?: number | null
          role?: string
          summary?: string | null
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
          context_data: Json | null
          created_at: string | null
          hidden: boolean | null
          id: string
          project_id: string | null
          system_prompt: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          context_data?: Json | null
          created_at?: string | null
          hidden?: boolean | null
          id?: string
          project_id?: string | null
          system_prompt?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          context_data?: Json | null
          created_at?: string | null
          hidden?: boolean | null
          id?: string
          project_id?: string | null
          system_prompt?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_pages: {
        Row: {
          access_token: string
          created_at: string | null
          id: string
          is_active: boolean | null
          page_id: string
          page_name: string
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          page_id: string
          page_name: string
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          page_id?: string
          page_name?: string
          token_expires_at?: string | null
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
      feed_data: {
        Row: {
          content: string | null
          created_at: string
          description: string | null
          feed_id: string
          guid: string | null
          id: string
          link: string | null
          media_url: string | null
          pub_date: string | null
          raw_data: Json | null
          thumb_image_url: string | null
          title: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          description?: string | null
          feed_id: string
          guid?: string | null
          id?: string
          link?: string | null
          media_url?: string | null
          pub_date?: string | null
          raw_data?: Json | null
          thumb_image_url?: string | null
          title?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          description?: string | null
          feed_id?: string
          guid?: string | null
          id?: string
          link?: string | null
          media_url?: string | null
          pub_date?: string | null
          raw_data?: Json | null
          thumb_image_url?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_data_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "feed_details"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_details: {
        Row: {
          active: boolean
          created_at: string
          date_last_checked: string | null
          feed_url: string
          id: string
          name: string
          pub_content: string | null
          pub_date: string | null
          pub_media: string | null
          pub_thumb_image: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          date_last_checked?: string | null
          feed_url: string
          id?: string
          name: string
          pub_content?: string | null
          pub_date?: string | null
          pub_media?: string | null
          pub_thumb_image?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          date_last_checked?: string | null
          feed_url?: string
          id?: string
          name?: string
          pub_content?: string | null
          pub_date?: string | null
          pub_media?: string | null
          pub_thumb_image?: string | null
          updated_at?: string
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
      pdf_analysis: {
        Row: {
          content: Json
          created_at: string
          id: string
          pdf_id: string
          status: string
          system_prompt_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          pdf_id: string
          status?: string
          system_prompt_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          pdf_id?: string
          status?: string
          system_prompt_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_analysis_pdf_id_fkey"
            columns: ["pdf_id"]
            isOneToOne: false
            referencedRelation: "pdf_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_analysis_system_prompt_id_fkey"
            columns: ["system_prompt_id"]
            isOneToOne: false
            referencedRelation: "system_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_uploads: {
        Row: {
          analysis_id: string | null
          created_at: string
          file_path: string
          file_size: number
          filename: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string
          file_path: string
          file_size: number
          filename: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          created_at?: string
          file_path?: string
          file_size?: number
          filename?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      playlist_songs: {
        Row: {
          added_to_app_at: string
          album_name: string | null
          artist_name: string
          duration_ms: number | null
          id: string
          removed_at: string | null
          search_year: number | null
          spotify_playlist_id: string
          spotify_track_id: string
          track_name: string
          user_id: string
        }
        Insert: {
          added_to_app_at?: string
          album_name?: string | null
          artist_name: string
          duration_ms?: number | null
          id?: string
          removed_at?: string | null
          search_year?: number | null
          spotify_playlist_id: string
          spotify_track_id: string
          track_name: string
          user_id: string
        }
        Update: {
          added_to_app_at?: string
          album_name?: string | null
          artist_name?: string
          duration_ms?: number | null
          id?: string
          removed_at?: string | null
          search_year?: number | null
          spotify_playlist_id?: string
          spotify_track_id?: string
          track_name?: string
          user_id?: string
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
      projects: {
        Row: {
          context_data: Json | null
          created_at: string
          hidden: boolean
          id: string
          name: string
          system_prompt: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_data?: Json | null
          created_at?: string
          hidden?: boolean
          id?: string
          name: string
          system_prompt?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_data?: Json | null
          created_at?: string
          hidden?: boolean
          id?: string
          name?: string
          system_prompt?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          content: string
          created_at: string | null
          error_message: string | null
          facebook_page_id: string | null
          facebook_post_id: string | null
          id: string
          images: Json | null
          posted_at: string | null
          scheduled_for: string | null
          stats: Json | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          error_message?: string | null
          facebook_page_id?: string | null
          facebook_post_id?: string | null
          id?: string
          images?: Json | null
          posted_at?: string | null
          scheduled_for?: string | null
          stats?: Json | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          error_message?: string | null
          facebook_page_id?: string | null
          facebook_post_id?: string | null
          id?: string
          images?: Json | null
          posted_at?: string | null
          scheduled_for?: string | null
          stats?: Json | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_facebook_page_id_fkey"
            columns: ["facebook_page_id"]
            isOneToOne: false
            referencedRelation: "facebook_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      songs_in_playlist: {
        Row: {
          added_at: string
          id: string
          playlist_id: string
          track_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          playlist_id: string
          track_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          playlist_id?: string
          track_id?: string
          user_id?: string
        }
        Relationships: []
      }
      spotify_playlists: {
        Row: {
          created_at: string
          id: string
          is_selected: boolean | null
          playlist_name: string
          spotify_playlist_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_selected?: boolean | null
          playlist_name: string
          spotify_playlist_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_selected?: boolean | null
          playlist_name?: string
          spotify_playlist_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      spotify_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
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
      system_prompts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          prompt: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          prompt: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          prompt?: string
          title?: string
          updated_at?: string
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
