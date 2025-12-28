import type { UUID, ISODateString } from './common';

export type UserRole = 'admin' | 'cajero' | 'manager' | 'employee' | 'mesero' | 'cocina' | 'encargado';

export interface User {
    id: UUID;
    email: string;
    full_name: string;
    role: UserRole;
    branch_id?: UUID;

    // Auth & Access
    is_active?: boolean;
    pin_code?: string; // POS Login

    created_at?: ISODateString;
    updated_at?: ISODateString;
}

export interface AuthSession {
    user: User;
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
}

export interface LoginCredentials {
    email: string;
    password: string;
}
