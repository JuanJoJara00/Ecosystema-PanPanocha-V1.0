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
      branch_ingredients: {
        Row: {
          branch_id: string
          current_stock: number | null
          id: string
          ingredient_id: string
          last_updated: string | null
          organization_id: string | null
        }
        Insert: {
          branch_id: string
          current_stock?: number | null
          id?: string
          ingredient_id: string
          last_updated?: string | null
          organization_id?: string | null
        }
        Update: {
          branch_id?: string
          current_stock?: number | null
          id?: string
          ingredient_id?: string
          last_updated?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_ingredients_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_ingredients_organization_id_fkey"
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
          id: string
          is_active: boolean | null
          product_id: string
        }
        Insert: {
          branch_id: string
          id?: string
          is_active?: boolean | null
          product_id: string
        }
        Update: {
          branch_id?: string
          id?: string
          is_active?: boolean | null
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
          created_at: string | null
          id: string
          name: string
          organization_id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
          updated_at?: string | null
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
      categories: {
        Row: {
          color: string | null
          icon: string | null
          id: string
          name: string
          organization_id: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          icon?: string | null
          id?: string
          name: string
          organization_id: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          icon?: string | null
          id?: string
          name?: string
          organization_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_organization_id_fkey"
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
          email: string | null
          full_name: string
          id: string
          organization_id: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          organization_id?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          organization_id?: string | null
          phone?: string | null
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
      deliveries: {
        Row: {
          assigned_driver: string | null
          branch_id: string | null
          client_payment_proof_url: string | null
          created_at: string | null
          customer_address: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_document_id: string | null
          delivery_fee: number | null
          delivery_name: string | null
          delivery_receipt_url: string | null
          id: string
          last_edit_type: Database["public"]["Enums"]["edit_type"] | null
          last_edited_at: string | null
          last_edited_by: string | null
          notes: string | null
          organization_id: string
          product_details: string | null
          status: Database["public"]["Enums"]["delivery_status"] | null
        }
        Insert: {
          assigned_driver?: string | null
          branch_id?: string | null
          client_payment_proof_url?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_document_id?: string | null
          delivery_fee?: number | null
          delivery_name?: string | null
          delivery_receipt_url?: string | null
          id?: string
          last_edit_type?: Database["public"]["Enums"]["edit_type"] | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          notes?: string | null
          organization_id: string
          product_details?: string | null
          status?: Database["public"]["Enums"]["delivery_status"] | null
        }
        Update: {
          assigned_driver?: string | null
          branch_id?: string | null
          client_payment_proof_url?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_document_id?: string | null
          delivery_fee?: number | null
          delivery_name?: string | null
          delivery_receipt_url?: string | null
          id?: string
          last_edit_type?: Database["public"]["Enums"]["edit_type"] | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          notes?: string | null
          organization_id?: string
          product_details?: string | null
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
          {
            foreignKeyName: "employee_custom_permissions_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_custom_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          position: Database["public"]["Enums"]["employee_position"]
          salary_type: Database["public"]["Enums"]["salary_type"] | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          base_salary?: number
          branch_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          hire_date?: string
          id?: string
          organization_id: string
          phone?: string | null
          position: Database["public"]["Enums"]["employee_position"]
          salary_type?: Database["public"]["Enums"]["salary_type"] | null
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
          position?: Database["public"]["Enums"]["employee_position"]
          salary_type?: Database["public"]["Enums"]["salary_type"] | null
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
          branch_id: string
          category: Database["public"]["Enums"]["expense_category"] | null
          created_at: string | null
          description: string
          id: string
          organization_id: string | null
          shift_id: string | null
        }
        Insert: {
          amount: number
          branch_id: string
          category?: Database["public"]["Enums"]["expense_category"] | null
          created_at?: string | null
          description: string
          id?: string
          organization_id?: string | null
          shift_id?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string
          category?: Database["public"]["Enums"]["expense_category"] | null
          created_at?: string | null
          description?: string
          id?: string
          organization_id?: string | null
          shift_id?: string | null
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
          id: string
          last_purchase_price: number | null
          min_stock_alert: number | null
          name: string
          organization_id: string
          sku: string | null
          supplier_id: string | null
          unit: Database["public"]["Enums"]["inventory_unit"]
          unit_cost: number | null
          usage_unit: string | null
          weighted_avg_cost: number | null
        }
        Insert: {
          buying_unit?: string | null
          conversion_factor?: number | null
          id?: string
          last_purchase_price?: number | null
          min_stock_alert?: number | null
          name: string
          organization_id: string
          sku?: string | null
          supplier_id?: string | null
          unit?: Database["public"]["Enums"]["inventory_unit"]
          unit_cost?: number | null
          usage_unit?: string | null
          weighted_avg_cost?: number | null
        }
        Update: {
          buying_unit?: string | null
          conversion_factor?: number | null
          id?: string
          last_purchase_price?: number | null
          min_stock_alert?: number | null
          name?: string
          organization_id?: string
          sku?: string | null
          supplier_id?: string | null
          unit?: Database["public"]["Enums"]["inventory_unit"]
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
      organizations: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          nit: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          nit?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          nit?: string | null
          phone?: string | null
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
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_proof_url: string | null
          payment_type: string | null
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["payroll_status"] | null
          updated_at: string | null
        }
        Insert: {
          base_amount?: number
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
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_proof_url?: string | null
          payment_type?: string | null
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["payroll_status"] | null
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
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_proof_url?: string | null
          payment_type?: string | null
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["payroll_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
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
      product_recipes: {
        Row: {
          id: string
          ingredient_id: string
          product_id: string
          quantity_required: number
        }
        Insert: {
          id?: string
          ingredient_id: string
          product_id: string
          quantity_required: number
        }
        Update: {
          id?: string
          ingredient_id?: string
          product_id?: string
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
      products: {
        Row: {
          active: boolean | null
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          organization_id: string
          price: number
          sku: string | null
          tax_rate: number | null
        }
        Insert: {
          active?: boolean | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          organization_id: string
          price?: number
          sku?: string | null
          tax_rate?: number | null
        }
        Update: {
          active?: boolean | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          organization_id?: string
          price?: number
          sku?: string | null
          tax_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
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
      purchase_order_items: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          order_id: string
          quantity: number
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          order_id: string
          quantity: number
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
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
          created_at: string | null
          id: string
          invoice_url: string | null
          last_edit_type: Database["public"]["Enums"]["edit_type"] | null
          last_modified_at: string | null
          last_modified_by: string | null
          organization_id: string
          payment_proof_url: string | null
          payment_status: Database["public"]["Enums"]["payroll_status"] | null
          requested_by: string
          status: Database["public"]["Enums"]["purchase_order_status"] | null
          supplier_id: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          id?: string
          invoice_url?: string | null
          last_edit_type?: Database["public"]["Enums"]["edit_type"] | null
          last_modified_at?: string | null
          last_modified_by?: string | null
          organization_id: string
          payment_proof_url?: string | null
          payment_status?: Database["public"]["Enums"]["payroll_status"] | null
          requested_by: string
          status?: Database["public"]["Enums"]["purchase_order_status"] | null
          supplier_id: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          id?: string
          invoice_url?: string | null
          last_edit_type?: Database["public"]["Enums"]["edit_type"] | null
          last_modified_at?: string | null
          last_modified_by?: string | null
          organization_id?: string
          payment_proof_url?: string | null
          payment_status?: Database["public"]["Enums"]["payroll_status"] | null
          requested_by?: string
          status?: Database["public"]["Enums"]["purchase_order_status"] | null
          supplier_id?: string
          total_amount?: number | null
          updated_at?: string | null
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
            referencedRelation: "users"
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
            referencedRelation: "users"
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
          created_at: string | null
          customer_address: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_fee: number | null
          id: string
          last_edit_type: Database["public"]["Enums"]["edit_type"] | null
          last_edited_at: string | null
          last_edited_by: string | null
          notes: string | null
          order_ready_url: string | null
          organization_id: string
          product_details: string | null
          rappi_order_id: string | null
          rappi_receipt_url: string | null
          status: Database["public"]["Enums"]["rappi_order_status"] | null
          ticket_url: string | null
          total_value: number | null
        }
        Insert: {
          assigned_driver?: string | null
          branch_id?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number | null
          id?: string
          last_edit_type?: Database["public"]["Enums"]["edit_type"] | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          notes?: string | null
          order_ready_url?: string | null
          organization_id: string
          product_details?: string | null
          rappi_order_id?: string | null
          rappi_receipt_url?: string | null
          status?: Database["public"]["Enums"]["rappi_order_status"] | null
          ticket_url?: string | null
          total_value?: number | null
        }
        Update: {
          assigned_driver?: string | null
          branch_id?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number | null
          id?: string
          last_edit_type?: Database["public"]["Enums"]["edit_type"] | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          notes?: string | null
          order_ready_url?: string | null
          organization_id?: string
          product_details?: string | null
          rappi_order_id?: string | null
          rappi_receipt_url?: string | null
          status?: Database["public"]["Enums"]["rappi_order_status"] | null
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
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          permission?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          id: string
          organization_id: string | null
          product_id: string
          quantity: number
          sale_id: string
          tax_amount: number | null
          total_price: number | null
          unit_price: number
        }
        Insert: {
          id?: string
          organization_id?: string | null
          product_id: string
          quantity?: number
          sale_id: string
          tax_amount?: number | null
          total_price?: number | null
          unit_price: number
        }
        Update: {
          id?: string
          organization_id?: string | null
          product_id?: string
          quantity?: number
          sale_id?: string
          tax_amount?: number | null
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          branch_id: string
          created_at: string | null
          id: string
          organization_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          shift_id: string | null
          status: Database["public"]["Enums"]["sale_status"] | null
          synced: boolean | null
          total_amount: number
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          id?: string
          organization_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          shift_id?: string | null
          status?: Database["public"]["Enums"]["sale_status"] | null
          synced?: boolean | null
          total_amount?: number
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          id?: string
          organization_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          shift_id?: string | null
          status?: Database["public"]["Enums"]["sale_status"] | null
          synced?: boolean | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          branch_id: string
          created_at: string | null
          end_time: string | null
          expected_cash: number | null
          final_cash: number | null
          id: string
          initial_cash: number | null
          organization_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["shift_status"] | null
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          end_time?: string | null
          expected_cash?: number | null
          final_cash?: number | null
          id?: string
          initial_cash?: number | null
          organization_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["shift_status"] | null
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          end_time?: string | null
          expected_cash?: number | null
          final_cash?: number | null
          id?: string
          initial_cash?: number | null
          organization_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["shift_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string | null
          delivery_day: string | null
          delivery_time_days: number | null
          email: string | null
          id: string
          name: string
          notes_delivery: string | null
          order_day: string | null
          organization_id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string | null
          delivery_day?: string | null
          delivery_time_days?: number | null
          email?: string | null
          id?: string
          name: string
          notes_delivery?: string | null
          order_day?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string | null
          delivery_day?: string | null
          delivery_time_days?: number | null
          email?: string | null
          id?: string
          name?: string
          notes_delivery?: string | null
          order_day?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string | null
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
      users: {
        Row: {
          active: boolean | null
          branch_id: string | null
          created_at: string | null
          email: string | null
          employee_id: string | null
          full_name: string | null
          id: string
          organization_id: string
          pin_code: string | null
          role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          active?: boolean | null
          branch_id?: string | null
          created_at?: string | null
          email?: string | null
          employee_id?: string | null
          full_name?: string | null
          id?: string
          organization_id: string
          pin_code?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          active?: boolean | null
          branch_id?: string | null
          created_at?: string | null
          email?: string | null
          employee_id?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string
          pin_code?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "users_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      delivery_status: "pending" | "dispatched" | "delivered" | "cancelled"
      edit_type: "created" | "updated" | "deleted" | "status_change"
      employee_position:
        | "cajero"
        | "panadero"
        | "cocina"
        | "mesero"
        | "domiciliario"
        | "limpieza"
        | "administrador"
        | "otro"
      expense_category:
        | "servicios"
        | "nomina"
        | "inventario"
        | "mantenimiento"
        | "arriendo"
        | "transporte"
        | "marketing"
        | "impuestos"
        | "domicilios"
        | "otro"
      inventory_unit:
        | "kg"
        | "g"
        | "l"
        | "ml"
        | "unidad"
        | "paquete"
        | "caja"
        | "docena"
        | "lb"
      payment_method:
        | "cash_panpanocha"
        | "cash_siigo"
        | "card"
        | "transfer"
        | "rappi"
      payroll_status: "pending" | "paid"
      purchase_order_status: "pending" | "approved" | "received" | "cancelled"
      rappi_order_status: "created" | "preparing" | "ready" | "picked_up"
      salary_type: "monthly" | "biweekly" | "weekly" | "daily" | "hourly"
      sale_status: "pending" | "completed" | "cancelled" | "refunded"
      shift_status: "open" | "closed" | "pending_review"
      user_role:
        | "dev"
        | "owner"
        | "admin"
        | "domicilios/pick-up"
        | "panadero"
        | "cajero"
        | "cocina"
        | "mesero"
        | "empleado"
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
      edit_type: ["created", "updated", "deleted", "status_change"],
      employee_position: [
        "cajero",
        "panadero",
        "cocina",
        "mesero",
        "domiciliario",
        "limpieza",
        "administrador",
        "otro",
      ],
      expense_category: [
        "servicios",
        "nomina",
        "inventario",
        "mantenimiento",
        "arriendo",
        "transporte",
        "marketing",
        "impuestos",
        "domicilios",
        "otro",
      ],
      inventory_unit: [
        "kg",
        "g",
        "l",
        "ml",
        "unidad",
        "paquete",
        "caja",
        "docena",
        "lb",
      ],
      payment_method: [
        "cash_panpanocha",
        "cash_siigo",
        "card",
        "transfer",
        "rappi",
      ],
      payroll_status: ["pending", "paid"],
      purchase_order_status: ["pending", "approved", "received", "cancelled"],
      rappi_order_status: ["created", "preparing", "ready", "picked_up"],
      salary_type: ["monthly", "biweekly", "weekly", "daily", "hourly"],
      sale_status: ["pending", "completed", "cancelled", "refunded"],
      shift_status: ["open", "closed", "pending_review"],
      user_role: [
        "dev",
        "owner",
        "admin",
        "domicilios/pick-up",
        "panadero",
        "cajero",
        "cocina",
        "mesero",
        "empleado",
      ],
    },
  },
} as const
