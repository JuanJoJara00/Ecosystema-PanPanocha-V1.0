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
      branch_inventory: {
        Row: {
          branch_id: string
          id: string
          item_id: string
          last_updated: string
          organization_id: string
          quantity: number | null
        }
        Insert: {
          branch_id: string
          id?: string
          item_id: string
          last_updated?: string
          organization_id: string
          quantity?: number | null
        }
        Update: {
          branch_id?: string
          id?: string
          item_id?: string
          last_updated?: string
          organization_id?: string
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_inventory_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_inventory_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_products: {
        Row: {
          branch_id: string
          created_at: string | null
          is_active: boolean | null
          price_override: number | null
          product_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          is_active?: boolean | null
          price_override?: number | null
          product_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          is_active?: boolean | null
          price_override?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          is_active: boolean | null
          manager_name: string | null
          name: string
          nit: string | null
          organization_id: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          manager_name?: string | null
          name: string
          nit?: string | null
          organization_id: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          manager_name?: string | null
          name?: string
          nit?: string | null
          organization_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string | null
          document_id: string | null
          email: string | null
          full_name: string
          id: string
          organization_id: string
          phone: string | null
          points: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          email?: string | null
          full_name: string
          id: string
          organization_id: string
          phone?: string | null
          points?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          email?: string | null
          full_name?: string
          id?: string
          organization_id?: string
          phone?: string | null
          points?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      closing_movements: {
        Row: {
          amount: number
          closing_id: string
          created_at: string | null
          description: string | null
          employee_id: string | null
          evidence_url: string | null
          id: string
          type: string
        }
        Insert: {
          amount: number
          closing_id: string
          created_at?: string | null
          description?: string | null
          employee_id?: string | null
          evidence_url?: string | null
          id?: string
          type: string
        }
        Update: {
          amount?: number
          closing_id?: string
          created_at?: string | null
          description?: string | null
          employee_id?: string | null
          evidence_url?: string | null
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "closing_movements_closing_id_fkey"
            columns: ["closing_id"]
            isOneToOne: false
            referencedRelation: "closings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_movements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      closing_products: {
        Row: {
          closing_id: string
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          total: number | null
          unit_price: number
        }
        Insert: {
          closing_id: string
          created_at?: string | null
          id?: string
          product_id: string
          quantity: number
          total?: number | null
          unit_price: number
        }
        Update: {
          closing_id?: string
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          total?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "closing_products_closing_id_fkey"
            columns: ["closing_id"]
            isOneToOne: false
            referencedRelation: "closings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      closings: {
        Row: {
          base_cash: number | null
          branch_id: string
          cash_audit_count: number | null
          closed_by: string
          closing_date: string | null
          closing_time: string | null
          closing_type: string
          created_at: string | null
          difference: number | null
          end_cash_real: number | null
          end_cash_system: number | null
          expenses_total: number | null
          id: string
          notes: string | null
          opened_by: string | null
          opening_time: string | null
          sales_card: number | null
          sales_cash: number | null
          sales_transfer: number | null
          shift: string | null
          siigo_expenses: number | null
          siigo_income: number | null
          start_cash: number | null
          status: string | null
          tips_total: number | null
        }
        Insert: {
          base_cash?: number | null
          branch_id: string
          cash_audit_count?: number | null
          closed_by: string
          closing_date?: string | null
          closing_time?: string | null
          closing_type: string
          created_at?: string | null
          difference?: number | null
          end_cash_real?: number | null
          end_cash_system?: number | null
          expenses_total?: number | null
          id?: string
          notes?: string | null
          opened_by?: string | null
          opening_time?: string | null
          sales_card?: number | null
          sales_cash?: number | null
          sales_transfer?: number | null
          shift?: string | null
          siigo_expenses?: number | null
          siigo_income?: number | null
          start_cash?: number | null
          status?: string | null
          tips_total?: number | null
        }
        Update: {
          base_cash?: number | null
          branch_id?: string
          cash_audit_count?: number | null
          closed_by?: string
          closing_date?: string | null
          closing_time?: string | null
          closing_type?: string
          created_at?: string | null
          difference?: number | null
          end_cash_real?: number | null
          end_cash_system?: number | null
          expenses_total?: number | null
          id?: string
          notes?: string | null
          opened_by?: string | null
          opening_time?: string | null
          sales_card?: number | null
          sales_cash?: number | null
          sales_transfer?: number | null
          shift?: string | null
          siigo_expenses?: number | null
          siigo_income?: number | null
          start_cash?: number | null
          status?: string | null
          tips_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "closings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closings_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          assigned_driver: string | null
          branch_id: string | null
          client_payment_proof_url: string | null
          created_at: string
          customer_address: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_document_id: string | null
          delivery_fee: number
          delivery_name: string | null
          delivery_receipt_url: string | null
          id: string
          last_edit_type: string | null
          last_edited_at: string | null
          last_edited_by: string | null
          notes: string | null
          organization_id: string
          product_details: string
          status: Database["public"]["Enums"]["delivery_status"] | null
        }
        Insert: {
          assigned_driver?: string | null
          branch_id?: string | null
          client_payment_proof_url?: string | null
          created_at?: string
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_document_id?: string | null
          delivery_fee?: number
          delivery_name?: string | null
          delivery_receipt_url?: string | null
          id?: string
          last_edit_type?: string | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          notes?: string | null
          organization_id: string
          product_details: string
          status?: Database["public"]["Enums"]["delivery_status"] | null
        }
        Update: {
          assigned_driver?: string | null
          branch_id?: string | null
          client_payment_proof_url?: string | null
          created_at?: string
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_document_id?: string | null
          delivery_fee?: number
          delivery_name?: string | null
          delivery_receipt_url?: string | null
          id?: string
          last_edit_type?: string | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          notes?: string | null
          organization_id?: string
          product_details?: string
          status?: Database["public"]["Enums"]["delivery_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          app_version: string | null
          auth_token_hash: string | null
          branch_id: string
          created_at: string | null
          deleted_at: string | null
          fingerprint: string | null
          id: string
          ip_address: string | null
          last_seen_at: string | null
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["device_status"] | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          app_version?: string | null
          auth_token_hash?: string | null
          branch_id: string
          created_at?: string | null
          deleted_at?: string | null
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string | null
          name: string
          organization_id?: string
          status?: Database["public"]["Enums"]["device_status"] | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          app_version?: string | null
          auth_token_hash?: string | null
          branch_id?: string
          created_at?: string | null
          deleted_at?: string | null
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string | null
          name?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["device_status"] | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_custom_permissions: {
        Row: {
          access_branches: boolean | null
          access_cash_closing: boolean | null
          access_dashboard: boolean | null
          access_deliveries: boolean | null
          access_employees: boolean | null
          access_inventory: boolean | null
          access_orders: boolean | null
          access_payroll: boolean | null
          access_pos: boolean | null
          access_products: boolean | null
          access_reports: boolean | null
          created_at: string | null
          employee_id: string
          id: string
          manage_all_users: boolean | null
          manage_branch_users: boolean | null
          modified_by: string | null
          pos_checkout: boolean | null
          pos_full_access: boolean | null
          pos_register_only: boolean | null
          updated_at: string | null
          user_id: string
          view_all_branches: boolean | null
          view_all_payroll: boolean | null
          view_own_branch_only: boolean | null
          view_own_data_only: boolean | null
        }
        Insert: {
          access_branches?: boolean | null
          access_cash_closing?: boolean | null
          access_dashboard?: boolean | null
          access_deliveries?: boolean | null
          access_employees?: boolean | null
          access_inventory?: boolean | null
          access_orders?: boolean | null
          access_payroll?: boolean | null
          access_pos?: boolean | null
          access_products?: boolean | null
          access_reports?: boolean | null
          created_at?: string | null
          employee_id: string
          id?: string
          manage_all_users?: boolean | null
          manage_branch_users?: boolean | null
          modified_by?: string | null
          pos_checkout?: boolean | null
          pos_full_access?: boolean | null
          pos_register_only?: boolean | null
          updated_at?: string | null
          user_id: string
          view_all_branches?: boolean | null
          view_all_payroll?: boolean | null
          view_own_branch_only?: boolean | null
          view_own_data_only?: boolean | null
        }
        Update: {
          access_branches?: boolean | null
          access_cash_closing?: boolean | null
          access_dashboard?: boolean | null
          access_deliveries?: boolean | null
          access_employees?: boolean | null
          access_inventory?: boolean | null
          access_orders?: boolean | null
          access_payroll?: boolean | null
          access_pos?: boolean | null
          access_products?: boolean | null
          access_reports?: boolean | null
          created_at?: string | null
          employee_id?: string
          id?: string
          manage_all_users?: boolean | null
          manage_branch_users?: boolean | null
          modified_by?: string | null
          pos_checkout?: boolean | null
          pos_full_access?: boolean | null
          pos_register_only?: boolean | null
          updated_at?: string | null
          user_id?: string
          view_all_branches?: boolean | null
          view_all_payroll?: boolean | null
          view_own_branch_only?: boolean | null
          view_own_data_only?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_custom_permissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean | null
          base_salary: number
          branch_id: string | null
          created_at: string | null
          email: string | null
          full_name: string
          hire_date: string
          id: string
          organization_id: string
          phone: string | null
          position: string
          salary_type: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          base_salary: number
          branch_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          hire_date: string
          id?: string
          organization_id: string
          phone?: string | null
          position: string
          salary_type?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          base_salary?: number
          branch_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          hire_date?: string
          id?: string
          organization_id?: string
          phone?: string | null
          position?: string
          salary_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string | null
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          organization_id: string
          payment_method: string | null
          shift_id: string | null
          user_id: string | null
          voucher_number: string | null
        }
        Insert: {
          amount: number
          branch_id?: string | null
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id: string
          payment_method?: string | null
          shift_id?: string | null
          user_id?: string | null
          voucher_number?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          payment_method?: string | null
          shift_id?: string | null
          user_id?: string | null
          voucher_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          buying_unit: string | null
          conversion_factor: number | null
          created_at: string
          id: string
          last_purchase_price: number | null
          min_stock_alert: number | null
          name: string
          organization_id: string
          sku: string | null
          supplier_id: string | null
          unit: string
          unit_cost: number | null
          usage_unit: string | null
          weighted_avg_cost: number | null
        }
        Insert: {
          buying_unit?: string | null
          conversion_factor?: number | null
          created_at?: string
          id?: string
          last_purchase_price?: number | null
          min_stock_alert?: number | null
          name: string
          organization_id: string
          sku?: string | null
          supplier_id?: string | null
          unit: string
          unit_cost?: number | null
          usage_unit?: string | null
          weighted_avg_cost?: number | null
        }
        Update: {
          buying_unit?: string | null
          conversion_factor?: number | null
          created_at?: string
          id?: string
          last_purchase_price?: number | null
          min_stock_alert?: number | null
          name?: string
          organization_id?: string
          sku?: string | null
          supplier_id?: string | null
          unit?: string
          unit_cost?: number | null
          usage_unit?: string | null
          weighted_avg_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_price_history: {
        Row: {
          branch_id: string | null
          buying_price: number | null
          created_at: string | null
          created_by: string | null
          id: string
          item_id: string | null
          new_avg_cost: number | null
          old_avg_cost: number | null
          quantity_bought: number | null
          transaction_type: string
        }
        Insert: {
          branch_id?: string | null
          buying_price?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id?: string | null
          new_avg_cost?: number | null
          old_avg_cost?: number | null
          quantity_bought?: number | null
          transaction_type: string
        }
        Update: {
          branch_id?: string | null
          buying_price?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id?: string | null
          new_avg_cost?: number | null
          old_avg_cost?: number | null
          quantity_bought?: number | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_price_history_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_price_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          organization_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          organization_id: string
          product_id: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          organization_id?: string
          product_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          branch_id: string
          created_at: string | null
          created_by: string | null
          customer_name: string | null
          diners: number | null
          id: string
          organization_id: string
          shift_id: string | null
          status: string | null
          table_id: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          diners?: number | null
          id?: string
          organization_id: string
          shift_id?: string | null
          status?: string | null
          table_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          diners?: number | null
          id?: string
          organization_id?: string
          shift_id?: string | null
          status?: string | null
          table_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payroll: {
        Row: {
          base_amount: number
          bonuses: number | null
          created_at: string | null
          created_by: string | null
          deductions: number | null
          employee_id: string
          id: string
          net_amount: number | null
          notes: string | null
          organization_id: string
          payment_date: string | null
          payment_method: string | null
          payment_proof_url: string | null
          payment_type: string | null
          period_end: string
          period_start: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          base_amount: number
          bonuses?: number | null
          created_at?: string | null
          created_by?: string | null
          deductions?: number | null
          employee_id: string
          id?: string
          net_amount?: number | null
          notes?: string | null
          organization_id: string
          payment_date?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          payment_type?: string | null
          period_end: string
          period_start: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          base_amount?: number
          bonuses?: number | null
          created_at?: string | null
          created_by?: string | null
          deductions?: number | null
          employee_id?: string
          id?: string
          net_amount?: number | null
          notes?: string | null
          organization_id?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          payment_type?: string | null
          period_end?: string
          period_start?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_items: {
        Row: {
          amount: number
          concept: string
          created_at: string | null
          id: string
          item_type: string
          payroll_id: string
        }
        Insert: {
          amount: number
          concept: string
          created_at?: string | null
          id?: string
          item_type: string
          payroll_id: string
        }
        Update: {
          amount?: number
          concept?: string
          created_at?: string | null
          id?: string
          item_type?: string
          payroll_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payroll"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_recipes: {
        Row: {
          created_at: string | null
          id: string
          ingredient_id: string | null
          product_id: string | null
          quantity_required: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredient_id?: string | null
          product_id?: string | null
          quantity_required: number
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredient_id?: string | null
          product_id?: string | null
          quantity_required?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_recipes_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_logs: {
        Row: {
          branch_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          product_id: string | null
          production_date: string | null
          quantity_produced: number
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          product_id?: string | null
          production_date?: string | null
          quantity_produced: number
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          product_id?: string | null
          production_date?: string | null
          quantity_produced?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          category: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          last_synced_at: string | null
          name: string
          organization_id: string
          price: number
          stock: number
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          last_synced_at?: string | null
          name: string
          organization_id: string
          price: number
          stock?: number
        }
        Update: {
          active?: boolean | null
          category?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          last_synced_at?: string | null
          name?: string
          organization_id?: string
          price?: number
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          branch_id: string | null
          created_at: string
          document_id: string | null
          email: string | null
          employee_id: string | null
          full_name: string | null
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          document_id?: string | null
          email?: string | null
          employee_id?: string | null
          full_name?: string | null
          id: string
          organization_id: string
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          document_id?: string | null
          email?: string | null
          employee_id?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provisioning_sessions: {
        Row: {
          assigned_branch_id: string | null
          created_at: string | null
          device_name: string | null
          expires_at: string | null
          fingerprint: string
          generated_auth_token: string | null
          id: string
          ip_address: string | null
          organization_id: string | null
          status: Database["public"]["Enums"]["provisioning_status"] | null
        }
        Insert: {
          assigned_branch_id?: string | null
          created_at?: string | null
          device_name?: string | null
          expires_at?: string | null
          fingerprint: string
          generated_auth_token?: string | null
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          status?: Database["public"]["Enums"]["provisioning_status"] | null
        }
        Update: {
          assigned_branch_id?: string | null
          created_at?: string | null
          device_name?: string | null
          expires_at?: string | null
          fingerprint?: string
          generated_auth_token?: string | null
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          status?: Database["public"]["Enums"]["provisioning_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "provisioning_sessions_assigned_branch_id_fkey"
            columns: ["assigned_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provisioning_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          order_id: string
          quantity: number
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          order_id: string
          quantity: number
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          order_id?: string
          quantity?: number
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          invoice_url: string | null
          last_edit_type: string | null
          last_modified_at: string | null
          last_modified_by: string | null
          organization_id: string
          payment_proof_url: string | null
          payment_status: string | null
          requested_by: string
          status: string | null
          supplier_id: string
          total_amount: number | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          invoice_url?: string | null
          last_edit_type?: string | null
          last_modified_at?: string | null
          last_modified_by?: string | null
          organization_id: string
          payment_proof_url?: string | null
          payment_status?: string | null
          requested_by: string
          status?: string | null
          supplier_id: string
          total_amount?: number | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          invoice_url?: string | null
          last_edit_type?: string | null
          last_modified_at?: string | null
          last_modified_by?: string | null
          organization_id?: string
          payment_proof_url?: string | null
          payment_status?: string | null
          requested_by?: string
          status?: string | null
          supplier_id?: string
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      rappi_deliveries: {
        Row: {
          assigned_driver: string | null
          branch_id: string | null
          created_at: string
          customer_address: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_fee: number | null
          id: string
          last_edit_type: string | null
          last_edited_at: string | null
          last_edited_by: string | null
          notes: string | null
          order_ready_url: string | null
          organization_id: string
          product_details: string | null
          rappi_order_id: string | null
          rappi_receipt_url: string | null
          status: string | null
          ticket_url: string | null
          total_value: number | null
        }
        Insert: {
          assigned_driver?: string | null
          branch_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number | null
          id?: string
          last_edit_type?: string | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          notes?: string | null
          order_ready_url?: string | null
          organization_id: string
          product_details?: string | null
          rappi_order_id?: string | null
          rappi_receipt_url?: string | null
          status?: string | null
          ticket_url?: string | null
          total_value?: number | null
        }
        Update: {
          assigned_driver?: string | null
          branch_id?: string | null
          created_at?: string
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number | null
          id?: string
          last_edit_type?: string | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          notes?: string | null
          order_ready_url?: string | null
          organization_id?: string
          product_details?: string | null
          rappi_order_id?: string | null
          rappi_receipt_url?: string | null
          status?: string | null
          ticket_url?: string | null
          total_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rappi_deliveries_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rappi_deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_settings: {
        Row: {
          company_name: string
          company_nit: string
          company_slogan: string | null
          created_at: string | null
          font_size_multiplier: number | null
          footer_text: string | null
          header_text: string | null
          id: string
          logo_url: string | null
          paper_width_mm: number | null
          show_cashier: boolean | null
          show_client_data: boolean | null
          show_footer_branding: boolean | null
          show_nit: boolean | null
          updated_at: string | null
        }
        Insert: {
          company_name?: string
          company_nit: string
          company_slogan?: string | null
          created_at?: string | null
          font_size_multiplier?: number | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          logo_url?: string | null
          paper_width_mm?: number | null
          show_cashier?: boolean | null
          show_client_data?: boolean | null
          show_footer_branding?: boolean | null
          show_nit?: boolean | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string
          company_nit?: string
          company_slogan?: string | null
          created_at?: string | null
          font_size_multiplier?: number | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          logo_url?: string | null
          paper_width_mm?: number | null
          show_cashier?: boolean | null
          show_client_data?: boolean | null
          show_footer_branding?: boolean | null
          show_nit?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          id: string
          organization_id: string
          product_id: string
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          organization_id: string
          product_id: string
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          id?: string
          organization_id?: string
          product_id?: string
          quantity?: number
          sale_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_new_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_new_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          branch_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          created_by_system: string | null
          diners: number | null
          discount_amount: number | null
          id: string
          notes: string | null
          order_id: string | null
          organization_id: string
          payment_method: string
          sale_channel: string | null
          shift_id: string | null
          status: string | null
          synced: boolean | null
          tip_amount: number | null
          total_amount: number
        }
        Insert: {
          branch_id?: string | null
          client_id?: string | null
          created_at: string
          created_by?: string | null
          created_by_system?: string | null
          diners?: number | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_id?: string | null
          organization_id: string
          payment_method: string
          sale_channel?: string | null
          shift_id?: string | null
          status?: string | null
          synced?: boolean | null
          tip_amount?: number | null
          total_amount: number
        }
        Update: {
          branch_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          created_by_system?: string | null
          diners?: number | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_id?: string | null
          organization_id?: string
          payment_method?: string
          sale_channel?: string | null
          shift_id?: string | null
          status?: string | null
          synced?: boolean | null
          tip_amount?: number | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_new_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_new_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_new_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_new_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          branch_id: string
          closing_metadata: Json | null
          created_at: string | null
          end_time: string | null
          expected_cash: number | null
          final_cash: number | null
          id: string
          initial_cash: number | null
          organization_id: string
          pending_tips: number | null
          start_time: string | null
          status: string | null
          turn_type: string | null
          user_id: string
        }
        Insert: {
          branch_id: string
          closing_metadata?: Json | null
          created_at?: string | null
          end_time?: string | null
          expected_cash?: number | null
          final_cash?: number | null
          id?: string
          initial_cash?: number | null
          organization_id: string
          pending_tips?: number | null
          start_time?: string | null
          status?: string | null
          turn_type?: string | null
          user_id: string
        }
        Update: {
          branch_id?: string
          closing_metadata?: Json | null
          created_at?: string | null
          end_time?: string | null
          expected_cash?: number | null
          final_cash?: number | null
          id?: string
          initial_cash?: number | null
          organization_id?: string
          pending_tips?: number | null
          start_time?: string | null
          status?: string | null
          turn_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_reservations: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          product_id: string | null
          quantity: number
          source_id: string
          source_type: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          product_id?: string | null
          quantity: number
          source_id: string
          source_type: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          product_id?: string | null
          quantity?: number
          source_id?: string
          source_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_reservations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_name: string | null
          created_at: string
          delivery_day: string | null
          delivery_time_days: number | null
          email: string | null
          id: string
          name: string
          notes_delivery: string | null
          order_day: string | null
          organization_id: string
          phone: string | null
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          delivery_day?: string | null
          delivery_time_days?: number | null
          email?: string | null
          id?: string
          name: string
          notes_delivery?: string | null
          order_day?: string | null
          organization_id: string
          phone?: string | null
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          delivery_day?: string | null
          delivery_time_days?: number | null
          email?: string | null
          id?: string
          name?: string
          notes_delivery?: string | null
          order_day?: string | null
          organization_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          branch_id: string
          created_at: string | null
          id: string
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tables_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      tip_distributions: {
        Row: {
          amount: number
          created_at: string | null
          employee_id: string | null
          employee_name: string | null
          id: string
          shift_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          shift_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          shift_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tip_distributions_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_events: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          payload: Json
          synced_at: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          payload: Json
          synced_at?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          payload?: Json
          synced_at?: string | null
          type?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          branch_id: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          pin_hash: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          pin_hash?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          pin_hash?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      current_user_permissions: {
        Row: {
          permission_name: string | null
          permission_value: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_modify_employee_permissions: {
        Args: { target_employee_id: string }
        Returns: boolean
      }
      decrement_product_stock: {
        Args: { product_id: string; quantity: number }
        Returns: undefined
      }
      deduct_inventory: {
        Args: { p_branch_id: string; p_products_json: Json }
        Returns: undefined
      }
      get_auth_org_id: { Args: never; Returns: string }
      get_branch_products_stock: {
        Args: { p_branch_id: string }
        Returns: {
          product_id: string
          stock: number
        }[]
      }
      get_effective_permissions: {
        Args: { target_user_id: string }
        Returns: {
          permission_name: string
          permission_value: boolean
        }[]
      }
      get_supplier_stats: {
        Args: never
        Returns: {
          current_debt: number
          supplier_id: string
          total_purchased: number
        }[]
      }
      handle_new_stock_entry: {
        Args: {
          p_branch_id: string
          p_item_id: string
          p_quantity_bought: number
          p_unit_price: number
          p_user_id?: string
        }
        Returns: Json
      }
    }
    Enums: {
      delivery_status: "pending" | "dispatched" | "delivered" | "cancelled"
      device_status: "pending" | "active" | "inactive" | "decommissioned"
      provisioning_status: "waiting" | "approved" | "rejected" | "expired"
      user_role: "admin" | "cajero" | "mesero" | "cocina" | "dev" | "empleado"
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
      delivery_status: ["pending", "dispatched", "delivered", "cancelled"],
      device_status: ["pending", "active", "inactive", "decommissioned"],
      provisioning_status: ["waiting", "approved", "rejected", "expired"],
      user_role: ["admin", "cajero", "mesero", "cocina", "dev", "empleado"],
    },
  },
} as const
