export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      company_members: {
        Row: {
          id: string
          company_id: string
          user_id: string
          role: 'owner' | 'board_member'
          invited_by: string
          invited_at: string
          accepted_at: string | null
          status: 'pending' | 'active' | 'removed'
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          role: 'owner' | 'board_member'
          invited_by: string
          invited_at?: string
          accepted_at?: string | null
          status?: 'pending' | 'active' | 'removed'
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          user_id?: string
          role?: 'owner' | 'board_member'
          invited_by?: string
          invited_at?: string
          accepted_at?: string | null
          status?: 'pending' | 'active' | 'removed'
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          company_id: string
          title: string
          description: string | null
          file_path: string
          file_name: string
          file_size: number
          file_type: string
          uploaded_by: string | null
          status: 'pending' | 'partially_signed' | 'fully_signed' | 'cancelled'
          requires_all_signatures: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          title: string
          description?: string | null
          file_path: string
          file_name: string
          file_size: number
          file_type: string
          uploaded_by?: string | null
          status?: 'pending' | 'partially_signed' | 'fully_signed' | 'cancelled'
          requires_all_signatures?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          title?: string
          description?: string | null
          file_path?: string
          file_name?: string
          file_size?: number
          file_type?: string
          uploaded_by?: string | null
          status?: 'pending' | 'partially_signed' | 'fully_signed' | 'cancelled'
          requires_all_signatures?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      document_signatures: {
        Row: {
          id: string
          document_id: string
          board_member_id: string
          company_id: string
          status: 'pending' | 'signed' | 'declined'
          signature_data: string | null
          signed_at: string | null
          declined_at: string | null
          decline_reason: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          board_member_id: string
          company_id: string
          status?: 'pending' | 'signed' | 'declined'
          signature_data?: string | null
          signed_at?: string | null
          declined_at?: string | null
          decline_reason?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          board_member_id?: string
          company_id?: string
          status?: 'pending' | 'signed' | 'declined'
          signature_data?: string | null
          signed_at?: string | null
          declined_at?: string | null
          decline_reason?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      document_audit_log: {
        Row: {
          id: string
          document_id: string
          user_id: string | null
          action: 'uploaded' | 'signature_requested' | 'signed' | 'declined' | 'viewed' | 'downloaded' | 'cancelled'
          details: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          user_id?: string | null
          action: 'uploaded' | 'signature_requested' | 'signed' | 'declined' | 'viewed' | 'downloaded' | 'cancelled'
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          user_id?: string | null
          action?: 'uploaded' | 'signature_requested' | 'signed' | 'declined' | 'viewed' | 'downloaded' | 'cancelled'
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    cap_table_entries: {
      Row: {
        id: string
        company_id: string
        holder_name: string
        holder_email: string | null
        holder_type: 'founder' | 'employee' | 'investor' | 'advisor' | 'other'
        equity_type: 'common_stock' | 'preferred_stock' | 'safe' | 'convertible_note' | 'option'
        shares: number
        price_per_share: number | null
        total_value: number | null
        issue_date: string | null
        notes: string | null
        created_at: string
        updated_at: string
        created_by: string
        user_id: string | null
      }
        Insert: {
          id?: string
          company_id: string
          holder_name: string
          holder_email?: string | null
          holder_type: 'founder' | 'employee' | 'investor' | 'advisor' | 'other'
          equity_type: 'common_stock' | 'preferred_stock' | 'safe' | 'convertible_note' | 'option'
          shares?: number
          price_per_share?: number | null
          total_value?: number | null
          issue_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by: string
        }
        Update: {
          id?: string
          company_id?: string
          holder_name?: string
          holder_email?: string | null
          holder_type?: 'founder' | 'employee' | 'investor' | 'advisor' | 'other'
          equity_type?: 'common_stock' | 'preferred_stock' | 'safe' | 'convertible_note' | 'option'
          shares?: number
          price_per_share?: number | null
          total_value?: number | null
          issue_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
    equity_grants: {
      Row: {
        id: string
        company_id: string
        recipient_name: string
        recipient_email: string | null
        grant_date: string
        total_shares: number
        vested_shares: number
        exercised_shares: number
        cancelled_shares: number
        vesting_start_date: string | null
        vesting_duration_months: number
        cliff_months: number
        exercise_price: number | null
        expiration_date: string | null
        grant_type: 'ISO' | 'NSO' | 'RSU' | 'RSA'
        status: 'active' | 'terminated' | 'fully_exercised' | 'expired'
        notes: string | null
        created_at: string
        updated_at: string
        created_by: string
        user_id: string | null
      }
        Insert: {
          id?: string
          company_id: string
          recipient_name: string
          recipient_email?: string | null
          grant_date: string
          total_shares: number
          vested_shares?: number
          exercised_shares?: number
          cancelled_shares?: number
          vesting_start_date?: string | null
          vesting_duration_months?: number
          cliff_months?: number
          exercise_price?: number | null
          expiration_date?: string | null
          grant_type: 'ISO' | 'NSO' | 'RSU' | 'RSA'
          status?: 'active' | 'terminated' | 'fully_exercised' | 'expired'
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by: string
        }
        Update: {
          id?: string
          company_id?: string
          recipient_name?: string
          recipient_email?: string | null
          grant_date?: string
          total_shares?: number
          vested_shares?: number
          exercised_shares?: number
          cancelled_shares?: number
          vesting_start_date?: string | null
          vesting_duration_months?: number
          cliff_months?: number
          exercise_price?: number | null
          expiration_date?: string | null
          grant_type?: 'ISO' | 'NSO' | 'RSU' | 'RSA'
          status?: 'active' | 'terminated' | 'fully_exercised' | 'expired'
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
      equity_transactions: {
        Row: {
          id: string
          company_id: string
          transaction_type: 'issuance' | 'transfer' | 'repurchase' | 'exercise' | 'cancellation' | 'conversion'
          transaction_date: string
          from_holder: string | null
          to_holder: string
          equity_type: 'common_stock' | 'preferred_stock' | 'safe' | 'convertible_note' | 'option'
          shares: number
          price_per_share: number | null
          total_amount: number | null
          related_grant_id: string | null
          notes: string | null
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          company_id: string
          transaction_type: 'issuance' | 'transfer' | 'repurchase' | 'exercise' | 'cancellation' | 'conversion'
          transaction_date: string
          from_holder?: string | null
          to_holder: string
          equity_type: 'common_stock' | 'preferred_stock' | 'safe' | 'convertible_note' | 'option'
          shares: number
          price_per_share?: number | null
          total_amount?: number | null
          related_grant_id?: string | null
          notes?: string | null
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          company_id?: string
          transaction_type?: 'issuance' | 'transfer' | 'repurchase' | 'exercise' | 'cancellation' | 'conversion'
          transaction_date?: string
          from_holder?: string | null
          to_holder?: string
          equity_type?: 'common_stock' | 'preferred_stock' | 'safe' | 'convertible_note' | 'option'
          shares?: number
          price_per_share?: number | null
          total_amount?: number | null
          related_grant_id?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string
        }
      }
    convertible_instruments: {
      Row: {
        id: string
        company_id: string
        investor_name: string
        investor_email: string | null
        instrument_type: 'SAFE' | 'convertible_note'
        principal_amount: number
        discount_rate: number | null
        valuation_cap: number | null
        interest_rate: number | null
        issue_date: string
        maturity_date: string | null
        conversion_trigger: string | null
        status: 'outstanding' | 'converted' | 'repaid' | 'expired'
        notes: string | null
        created_at: string
        updated_at: string
        created_by: string
        user_id: string | null
      }
        Insert: {
          id?: string
          company_id: string
          investor_name: string
          investor_email?: string | null
          instrument_type: 'SAFE' | 'convertible_note'
          principal_amount: number
          discount_rate?: number | null
          valuation_cap?: number | null
          interest_rate?: number | null
          issue_date: string
          maturity_date?: string | null
          conversion_trigger?: string | null
          status?: 'outstanding' | 'converted' | 'repaid' | 'expired'
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by: string
        }
        Update: {
          id?: string
          company_id?: string
          investor_name?: string
          investor_email?: string | null
          instrument_type?: 'SAFE' | 'convertible_note'
          principal_amount?: number
          discount_rate?: number | null
          valuation_cap?: number | null
          interest_rate?: number | null
          issue_date?: string
          maturity_date?: string | null
          conversion_trigger?: string | null
          status?: 'outstanding' | 'converted' | 'repaid' | 'expired'
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
      fundraising_rounds: {
        Row: {
          id: string
          company_id: string
          round_name: string
          round_type: 'seed' | 'series_a' | 'series_b' | 'series_c' | 'series_d' | 'bridge' | 'other'
          close_date: string
          valuation_pre_money: number | null
          valuation_post_money: number | null
          amount_raised: number
          shares_issued: number | null
          price_per_share: number | null
          lead_investor: string | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string
        }
        Insert: {
          id?: string
          company_id: string
          round_name: string
          round_type: 'seed' | 'series_a' | 'series_b' | 'series_c' | 'series_d' | 'bridge' | 'other'
          close_date: string
          valuation_pre_money?: number | null
          valuation_post_money?: number | null
          amount_raised: number
          shares_issued?: number | null
          price_per_share?: number | null
          lead_investor?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by: string
        }
        Update: {
          id?: string
          company_id?: string
          round_name?: string
          round_type?: 'seed' | 'series_a' | 'series_b' | 'series_c' | 'series_d' | 'bridge' | 'other'
          close_date?: string
          valuation_pre_money?: number | null
          valuation_post_money?: number | null
          amount_raised?: number
          shares_issued?: number | null
          price_per_share?: number | null
          lead_investor?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
      option_pools: {
        Row: {
          id: string
          company_id: string
          pool_name: string
          total_shares: number
          granted_shares: number
          available_shares: number
          created_date: string
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string
        }
        Insert: {
          id?: string
          company_id: string
          pool_name: string
          total_shares: number
          granted_shares?: number
          available_shares: number
          created_date: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by: string
        }
        Update: {
          id?: string
          company_id?: string
          pool_name?: string
          total_shares?: number
          granted_shares?: number
          available_shares?: number
          created_date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
    }
  }
}
