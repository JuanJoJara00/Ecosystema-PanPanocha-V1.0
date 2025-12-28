import type { UUID, ISODateString } from './common';

export interface Client {
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
