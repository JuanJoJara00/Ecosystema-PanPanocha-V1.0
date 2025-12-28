import type { UUID, ISODateString } from './common';

// Table Management
export interface Table {
    id: UUID;
    branch_id: UUID;
    name: string;
    status: 'available' | 'occupied' | 'reserved';
    created_at?: ISODateString;
    updated_at?: ISODateString;
}

export interface TableOrderItem {
    id: UUID;
    order_id: UUID;
    product_id: UUID;
    quantity: number;
    unit_price: number;
    total_price: number;
    created_at?: ISODateString;
    product_name?: string; // UI
}

// Renamed from 'Order' in POS to avoid conflict with Supplier Order
export interface TableOrder {
    id: UUID;
    table_id?: UUID;
    shift_id?: UUID;
    branch_id: UUID;
    created_by?: UUID;
    customer_name: string;
    status: 'pending' | 'completed' | 'cancelled';
    total_amount: number;
    created_at?: ISODateString;
    updated_at?: ISODateString;
    synced?: boolean;
    diners?: number;
    items?: TableOrderItem[];
}
