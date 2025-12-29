import type { UUID, ISODateString, TenantEntity } from './common';

export interface Branch extends TenantEntity {
    id: UUID;
    name: string;
    city: string;
    address?: string;
    phone?: string;
    is_active: boolean;
    created_at?: ISODateString;
    updated_at?: ISODateString;
}

export interface BranchWithStats extends Branch {
    total_sales?: number;
    gross_sales?: number;
    employee_count?: number;
}
