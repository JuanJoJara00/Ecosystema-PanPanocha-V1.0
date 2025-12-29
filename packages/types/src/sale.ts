import type { UUID, ISODateString, TenantEntity } from './common';
import type { Product } from './product';

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'rappi' | 'mixed';
export type SaleStatus = 'completed' | 'voided' | 'pending';
export type SaleChannel = 'pos' | 'delivery' | 'rappi' | 'web';

export interface CartItem {
    id: string; // usually a temp UUID
    product: Product;
    quantity: number;
    note?: string;
    modifiers?: { id: string; name: string; price: number }[];
}

export interface Sale extends TenantEntity {
    id: UUID;
    branch_id: UUID;
    created_by: UUID; // user_id

    // Core Data
    total_amount: number;
    payment_method: PaymentMethod;
    status: SaleStatus;

    // Context
    shift_id?: UUID;
    order_id?: UUID;
    client_id?: UUID;
    sale_channel?: SaleChannel;
    created_by_system?: string;
    source_device_id?: UUID; // Hardware Attribution

    // Monetary Details
    tip_amount?: number;
    discount_amount?: number;

    // metadata
    diners?: number;
    notes?: string;
    synced?: boolean;
    created_at: ISODateString;

    // Optional Expansion (for UI/Details)
    items?: SaleItem[];
}

export interface SaleItem {
    id: UUID;
    sale_id: UUID;
    product_id: UUID;
    product_name?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

export interface SaleSummary {
    total_sales: number;
    total_amount: number;
    cash_amount: number;
    card_amount: number;
    transfer_amount: number;
    rappi_amount: number;
}
