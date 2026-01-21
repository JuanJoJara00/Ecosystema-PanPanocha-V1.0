import type { UUID, ISODateString, TenantEntity } from './common';

export type SalesChannelType = 'retail' | 'delivery' | 'wholesale' | 'ecommerce';

export interface SalesChannel extends TenantEntity {
    id: UUID;
    name: string;
    type: SalesChannelType;
    is_active: boolean;
    created_at?: ISODateString;
}

export interface ProductPriceOverride extends TenantEntity {
    id: UUID;
    product_id: UUID;
    channel_id?: UUID | null;
    branch_id?: UUID | null;
    price: number;
    is_active: boolean; // For granular visibility
    created_at?: ISODateString;
    updated_at?: ISODateString;
}

export interface PriceResolutionContext {
    branchId: UUID | null;
    channelId: UUID | null;
}
