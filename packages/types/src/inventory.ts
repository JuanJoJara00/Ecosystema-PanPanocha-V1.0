import type { UUID, ISODateString } from './common';

export interface InventoryItem {
    id: UUID;
    product_id: UUID;
    product_name: string;
    branch_id: UUID;
    quantity: number;
    min_stock?: number;
    max_stock?: number;
    unit_cost?: number;
    supplier_id?: UUID;
    supplier_name?: string;
    last_updated?: ISODateString;
}

export interface InventoryMovement {
    id: UUID;
    product_id: UUID;
    branch_id: UUID;
    movement_type: 'in' | 'out' | 'adjustment';
    quantity: number;
    reason?: string;
    created_by: UUID;
    created_at: ISODateString;
}

export interface StockAlert {
    product_id: UUID;
    product_name: string;
    branch_id: UUID;
    current_stock: number;
    min_stock: number;
    alert_level: 'low' | 'critical' | 'out';
}
