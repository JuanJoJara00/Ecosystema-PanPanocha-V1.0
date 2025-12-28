import type { UUID, ISODateString } from './common';

export interface Delivery {
    id: UUID;
    sale_id?: UUID;
    customer_name: string;
    phone: string;
    address: string;
    status: 'pending' | 'assigned' | 'delivered' | 'cancelled';
    delivery_person?: string;
    delivery_cost: number;
    notes?: string;
    created_at: ISODateString;
}

export interface RappiDelivery {
    id: UUID;
    order_id: string; // alphanumeric rappi id
    status: 'pending' | 'cooking' | 'ready' | 'picked_up' | 'delivered' | 'canceled';
    driver_name?: string;
    driver_phone?: string;
    items_json: string; // JSON string of items
    total: number;
    created_at: ISODateString;
    synced: boolean;
}
