import type { UUID, ISODateString, TenantEntity } from './common';

export interface Delivery extends TenantEntity {
    id: UUID;
    branch_id: UUID; // Added to match payload
    sale_id?: UUID;
    customer_name: string;

    // Contact Info (Canonical + Legacy support if needed, but per request we use canonical)
    phone?: string; // Kept for backward compat if UI uses it explicitly
    address?: string; // Kept for backward compat

    // DB Schema Fields
    customer_phone?: string;
    customer_address?: string;

    status: 'pending' | 'dispatched' | 'delivered' | 'cancelled';

    // Canonical Fields
    assigned_driver?: string; // Renamed from delivery_person
    delivery_fee: number;     // Renamed from delivery_cost

    product_details?: string; // Added to match payload
    notes?: string;
    created_at: ISODateString;
}

// Conflict resolution: RappiDelivery is exported from ./rappi.ts
// export interface RappiDelivery { ... } removed to avoid duplication

/*
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
*/
