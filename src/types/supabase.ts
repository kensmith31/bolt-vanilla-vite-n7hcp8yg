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
      admin_users: {
        Row: {
          created_at: string | null
          id: string
          is_admin: boolean | null
        }
        Insert: {
          created_at?: string | null
          id: string
          is_admin?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      claim_participants: {
        Row: {
          added_at: string | null
          added_by: string | null
          claim_id: string | null
          company_id: number | null
          id: string
          last_active: string | null
          role_id: string
          user_id: string | null
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          claim_id?: string | null
          company_id?: number | null
          id?: string
          last_active?: string | null
          role_id: string
          user_id?: string | null
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          claim_id?: string | null
          company_id?: number | null
          id?: string
          last_active?: string | null
          role_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_participants_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_participants_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["file_number"]
          },
          {
            foreignKeyName: "claim_participants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "claim_participants_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          company_id: number | null
          created_by: string | null
          date_created: string | null
          date_updated: string | null
          default_tax_rate: number | null
          depreciation_applicable: boolean | null
          depreciation_recoverable: boolean | null
          email: string | null
          file_number: string
          insured_first_name: string
          insured_last_name: string
          phone_number: string | null
          property_address: string | null
          property_city: string | null
          property_state: string | null
          property_zip_code: string | null
          status: Database["public"]["Enums"]["claim_status"] | null
        }
        Insert: {
          company_id?: number | null
          created_by?: string | null
          date_created?: string | null
          date_updated?: string | null
          default_tax_rate?: number | null
          depreciation_applicable?: boolean | null
          depreciation_recoverable?: boolean | null
          email?: string | null
          file_number: string
          insured_first_name: string
          insured_last_name: string
          phone_number?: string | null
          property_address?: string | null
          property_city?: string | null
          property_state?: string | null
          property_zip_code?: string | null
          status?: Database["public"]["Enums"]["claim_status"] | null
        }
        Update: {
          company_id?: number | null
          created_by?: string | null
          date_created?: string | null
          date_updated?: string | null
          default_tax_rate?: number | null
          depreciation_applicable?: boolean | null
          depreciation_recoverable?: boolean | null
          email?: string | null
          file_number?: string
          insured_first_name?: string
          insured_last_name?: string
          phone_number?: string | null
          property_address?: string | null
          property_city?: string | null
          property_state?: string | null
          property_zip_code?: string | null
          status?: Database["public"]["Enums"]["claim_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "claims_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          company_address: string | null
          company_email: string | null
          company_id: number
          company_maincontact: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string
        }
        Insert: {
          company_address?: string | null
          company_email?: string | null
          company_id?: number
          company_maincontact?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
        }
        Update: {
          company_address?: string | null
          company_email?: string | null
          company_id?: number
          company_maincontact?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
        }
        Relationships: []
      }
      generated_reports: {
        Row: {
          claim_id: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          report_url: string | null
          share_link: string | null
          share_link_expiry: string | null
          spreadsheet_url: string | null
          template_id: string | null
        }
        Insert: {
          claim_id?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          report_url?: string | null
          share_link?: string | null
          share_link_expiry?: string | null
          spreadsheet_url?: string | null
          template_id?: string | null
        }
        Update: {
          claim_id?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          report_url?: string | null
          share_link?: string | null
          share_link_expiry?: string | null
          spreadsheet_url?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["file_number"]
          },
          {
            foreignKeyName: "generated_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      item_change_history: {
        Row: {
          changed_at: string | null
          field_name: string
          id: string
          item_id: string | null
          new_value: Json | null
          old_value: Json | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          changed_at?: string | null
          field_name: string
          id?: string
          item_id?: string | null
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          changed_at?: string | null
          field_name?: string
          id?: string
          item_id?: string | null
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_change_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_change_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          acv: number | null
          adjusted_rcv: number | null
          adjuster_notes: string | null
          age: number | null
          category_id: number | null
          claim_id: string | null
          claimed_rcv: number | null
          clean_allowance: boolean | null
          cleaning_allowance: boolean | null
          cleaning_allowance_amount: number | null
          comparable_image: string | null
          comparable_link: string | null
          condition: Database["public"]["Enums"]["item_condition"] | null
          created_at: string | null
          depreciation_amount: number | null
          depreciation_percent: number | null
          description: string
          duplicate_item: boolean | null
          holdback_due: number | null
          id: string
          item_number: number
          location_coordinates: Json | null
          no_loss_or_damage: boolean | null
          not_involved_in_claim: boolean | null
          photos: string[] | null
          policyholder_viewable: boolean | null
          quantity: number | null
          rcv_plus_tax: number | null
          rcv_total: number | null
          receipts: string[] | null
          replaced: boolean | null
          replacement_cost_applies: boolean | null
          replacement_spent: number | null
          room: string | null
          status: Database["public"]["Enums"]["item_status"]
          status_display: string | null
          submitted_by: Database["public"]["Enums"]["submission_source"] | null
          tax_amount: number | null
          tax_rate: number | null
          tax_rate_is_custom: boolean | null
          updated_at: string | null
        }
        Insert: {
          acv?: number | null
          adjusted_rcv?: number | null
          adjuster_notes?: string | null
          age?: number | null
          category_id?: number | null
          claim_id?: string | null
          claimed_rcv?: number | null
          clean_allowance?: boolean | null
          cleaning_allowance?: boolean | null
          cleaning_allowance_amount?: number | null
          comparable_image?: string | null
          comparable_link?: string | null
          condition?: Database["public"]["Enums"]["item_condition"] | null
          created_at?: string | null
          depreciation_amount?: number | null
          depreciation_percent?: number | null
          description: string
          duplicate_item?: boolean | null
          holdback_due?: number | null
          id?: string
          item_number?: number
          location_coordinates?: Json | null
          no_loss_or_damage?: boolean | null
          not_involved_in_claim?: boolean | null
          photos?: string[] | null
          policyholder_viewable?: boolean | null
          quantity?: number | null
          rcv_plus_tax?: number | null
          rcv_total?: number | null
          receipts?: string[] | null
          replaced?: boolean | null
          replacement_cost_applies?: boolean | null
          replacement_spent?: number | null
          room?: string | null
          status?: Database["public"]["Enums"]["item_status"]
          status_display?: string | null
          submitted_by?: Database["public"]["Enums"]["submission_source"] | null
          tax_amount?: number | null
          tax_rate?: number | null
          tax_rate_is_custom?: boolean | null
          updated_at?: string | null
        }
        Update: {
          acv?: number | null
          adjusted_rcv?: number | null
          adjuster_notes?: string | null
          age?: number | null
          category_id?: number | null
          claim_id?: string | null
          claimed_rcv?: number | null
          clean_allowance?: boolean | null
          cleaning_allowance?: boolean | null
          cleaning_allowance_amount?: number | null
          comparable_image?: string | null
          comparable_link?: string | null
          condition?: Database["public"]["Enums"]["item_condition"] | null
          created_at?: string | null
          depreciation_amount?: number | null
          depreciation_percent?: number | null
          description?: string
          duplicate_item?: boolean | null
          holdback_due?: number | null
          id?: string
          item_number?: number
          location_coordinates?: Json | null
          no_loss_or_damage?: boolean | null
          not_involved_in_claim?: boolean | null
          photos?: string[] | null
          policyholder_viewable?: boolean | null
          quantity?: number | null
          rcv_plus_tax?: number | null
          rcv_total?: number | null
          receipts?: string[] | null
          replaced?: boolean | null
          replacement_cost_applies?: boolean | null
          replacement_spent?: number | null
          room?: string | null
          status?: Database["public"]["Enums"]["item_status"]
          status_display?: string | null
          submitted_by?: Database["public"]["Enums"]["submission_source"] | null
          tax_amount?: number | null
          tax_rate?: number | null
          tax_rate_is_custom?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_items_category_id"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["file_number"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: string[] | null
          claim_id: string | null
          id: string
          item_id: string | null
          message: string
          read_by: Json | null
          role: string
          sender_id: string | null
          sent_at: string | null
        }
        Insert: {
          attachments?: string[] | null
          claim_id?: string | null
          id?: string
          item_id?: string | null
          message: string
          read_by?: Json | null
          role: string
          sender_id?: string | null
          sent_at?: string | null
        }
        Update: {
          attachments?: string[] | null
          claim_id?: string | null
          id?: string
          item_id?: string | null
          message?: string
          read_by?: Json | null
          role?: string
          sender_id?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["file_number"]
          },
          {
            foreignKeyName: "messages_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          template_structure: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          template_structure: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          template_structure?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          claim_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          claim_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          claim_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["file_number"]
          },
          {
            foreignKeyName: "rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_companies: {
        Row: {
          company_id: number | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          user_id: string | null
        }
        Insert: {
          company_id?: number | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          user_id?: string | null
        }
        Update: {
          company_id?: number | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "user_companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          company_id: number | null
          created_at: string | null
          created_by: string | null
          email: string
          first_name: string | null
          id: string
          last_login: string | null
          last_name: string | null
          phone: string | null
          role_id: string
          status: Database["public"]["Enums"]["user_status"] | null
        }
        Insert: {
          company_id?: number | null
          created_at?: string | null
          created_by?: string | null
          email: string
          first_name?: string | null
          id: string
          last_login?: string | null
          last_name?: string | null
          phone?: string | null
          role_id: string
          status?: Database["public"]["Enums"]["user_status"] | null
        }
        Update: {
          company_id?: number | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_login?: string | null
          last_name?: string | null
          phone?: string | null
          role_id?: string
          status?: Database["public"]["Enums"]["user_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      akeys: {
        Args: { "": unknown }
        Returns: string[]
      }
      avals: {
        Args: { "": unknown }
        Returns: string[]
      }
      each: {
        Args: { hs: unknown }
        Returns: Record<string, unknown>[]
      }
      filter_null_check: {
        Args: { field_value: unknown; filter_value: string; field_name: string }
        Returns: boolean
      }
      get_editable_fields: {
        Args: { p_tab: string; p_user_role: string; p_item_status: string }
        Returns: string[]
      }
      get_user_company_id: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: string
      }
      get_user_role_id: {
        Args: { user_id: string }
        Returns: {
          role_id: string
        }[]
      }
      ghstore_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      ghstore_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      ghstore_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      ghstore_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      ghstore_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      hstore: {
        Args: { "": string[] } | { "": Record<string, unknown> }
        Returns: unknown
      }
      hstore_hash: {
        Args: { "": unknown }
        Returns: number
      }
      hstore_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      hstore_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      hstore_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      hstore_send: {
        Args: { "": unknown }
        Returns: string
      }
      hstore_subscript_handler: {
        Args: { "": unknown }
        Returns: unknown
      }
      hstore_to_array: {
        Args: { "": unknown }
        Returns: string[]
      }
      hstore_to_json: {
        Args: { "": unknown }
        Returns: Json
      }
      hstore_to_json_loose: {
        Args: { "": unknown }
        Returns: Json
      }
      hstore_to_jsonb: {
        Args: { "": unknown }
        Returns: Json
      }
      hstore_to_jsonb_loose: {
        Args: { "": unknown }
        Returns: Json
      }
      hstore_to_matrix: {
        Args: { "": unknown }
        Returns: string[]
      }
      hstore_version_diag: {
        Args: { "": unknown }
        Returns: number
      }
      is_adjuster: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_claim_participant: {
        Args: { claim_file_number: string }
        Returns: boolean
      }
      is_company_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_empty_or_null: {
        Args: { field_value: unknown; field_name: string }
        Returns: boolean
      }
      is_policyholder: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      skeys: {
        Args: { "": unknown }
        Returns: string[]
      }
      svals: {
        Args: { "": unknown }
        Returns: string[]
      }
    }
    Enums: {
      claim_status: "active" | "under_review" | "complete"
      item_condition: "poor" | "fair" | "good" | "new"
      item_status:
        | "submitted"
        | "in_review"
        | "priced"
        | "adjusted"
        | "holdback_paid"
      submission_source:
        | "adjuster"
        | "insured"
        | "field_adjuster"
        | "policyholder"
      user_status: "active" | "inactive"
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
      claim_status: ["active", "under_review", "complete"],
      item_condition: ["poor", "fair", "good", "new"],
      item_status: [
        "submitted",
        "in_review",
        "priced",
        "adjusted",
        "holdback_paid",
      ],
      submission_source: [
        "adjuster",
        "insured",
        "field_adjuster",
        "policyholder",
      ],
      user_status: ["active", "inactive"],
    },
  },
} as const
