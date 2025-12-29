import type { UUID, ISODateString, TenantEntity } from './common';

export interface Client extends TenantEntity {
    id: UUID;
    full_name: string;
    document_id: string;
    phone: string;
    email?: string;
    points: number;
    created_at: ISODateString;
    updated_at: ISODateString;
    synced: boolean;
}
