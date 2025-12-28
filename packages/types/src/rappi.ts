import type { UUID, ISODateString } from './common';

export type RappiOrderStatus = 'pending' | 'dispatched' | 'delivered' | 'cancelled' | 'ready' | 'picked_up';

export interface RappiDelivery {
    id: UUID;
    rappi_order_id: string;
    // Portal uses customer_name/client_name inconsistently, we will unify
    customer_name?: string;
    client_name?: string; // keeping for backward compat if needed, prefer customer_name

    product_details: string; // JSON String
    total_amount?: number;
    total_value?: number; // Alias for total_amount, Portal uses this

    status: RappiOrderStatus;

    branch_id?: UUID;

    // Proofs
    ticket_url?: string;
    order_ready_url?: string;

    notes?: string;
    assigned_driver?: string;

    created_at: ISODateString;
    last_edited_at?: ISODateString;
    last_edited_by?: UUID;
    last_edit_type?: 'manual' | 'delivery';

    synced?: boolean;
}
