import type { UUID, ISODateString } from './common';

export interface InventoryItem {
    id: UUID;
    organization_id: UUID;
    name: string;
    sku?: string;
    description?: string;
    image_url?: string;
    unit: string;
    min_stock_alert: number;
    unit_cost?: number; // Costo manual / referencia
    supplier_id?: UUID;
    item_type?: 'raw_material' | 'supply'; // New field for separation

    // Weighted Average Cost (WAC) & Purchase Units
    buying_unit?: string;
    usage_unit?: string;
    conversion_factor?: number; // How many usage_units in a buying_unit
    last_purchase_price?: number;
    weighted_avg_cost?: number;

    created_at?: ISODateString;
    updated_at?: ISODateString;

    // Joins (Optional)
    supplier?: { name: string };
    branch_ingredients?: BranchIngredient[];
    suppliers?: { name: string }; // Supabase relation alias often matches table name plural
}

export interface BranchIngredient {
    branch_id: UUID;
    ingredient_id: UUID;
    current_stock: number;
    last_counted_at?: ISODateString;
    is_active?: boolean;
}

export interface InventoryMovement {
    id: UUID;
    organization_id: UUID;
    ingredient_id: UUID; // Changed from product_id to match inventory_items context
    branch_id: UUID;
    movement_type: 'in' | 'out' | 'adjustment' | 'transfer' | 'waste' | 'sale';
    quantity: number;
    unit_cost?: number; // Cost at time of movement
    reason?: string;
    reference_id?: UUID; // e.g., order_id, sale_id
    created_by?: UUID;
    created_at: ISODateString;
}
