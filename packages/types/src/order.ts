import type { UUID, ISODateString } from './common';

export type OrderStatus = 'pending' | 'received' | 'partial' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'partial';

export interface Order {
    id: UUID;
    branch_id: UUID;
    supplier_id?: UUID;
    supplier_name?: string;
    order_date: ISODateString;
    delivery_date?: ISODateString;
    total_amount: number;
    status: OrderStatus;
    payment_status: PaymentStatus;
    notes?: string;
    created_by?: UUID;
    created_at?: ISODateString;
    updated_at?: ISODateString;
}

export interface OrderItem {
    id: UUID;
    order_id: UUID;
    product_id?: UUID;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    received_quantity?: number;
}
