import type { UUID, ISODateString } from './common';

// Product types - unified from both Portal and POS
export interface Product {
    id: UUID;
    name: string;
    description?: string;
    price: number;
    category?: string | { name: string }; // String (POS) or Object (Portal)
    category_id?: string; // Portal FK

    // Unified Status
    active: boolean;
    is_active?: boolean; // Deprecated: alias for active (Portal compatibility)

    image_url?: string;
    stock?: number; // From POS

    created_at?: ISODateString;
    updated_at?: ISODateString;
    last_synced_at?: ISODateString;
}

export interface BranchProduct extends Product {
    branch_id: UUID;
    branch_name?: string;
    min_stock?: number;
}

export interface ProductCategory {
    id: UUID;
    name: string;
    description?: string;
    is_active: boolean;
}
