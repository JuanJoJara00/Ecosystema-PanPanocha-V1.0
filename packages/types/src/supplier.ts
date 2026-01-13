import type { UUID, ISODateString } from './common';

export interface Supplier {
    id: UUID;
    name: string;
    contact_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;

    // Status
    active: boolean;
    is_active?: boolean; // Deprecated

    // Portal Fields
    tax_id?: string;
    payment_terms?: string;
    category?: string;
    notes?: string;
    order_day?: string;
    delivery_day?: string;
    delivery_time_days?: number;
    notes_delivery?: string;

    created_at?: ISODateString;
    updated_at?: ISODateString;
}
