import type { UUID, ISODateString } from './common';

export type DeviceStatus = 'pending' | 'active' | 'inactive' | 'decommissioned';
export type DeviceType = 'pos_terminal' | 'kiosk' | 'tablet' | 'kitchen_display';

export interface Device {
    id: UUID;
    branch_id: UUID;
    name: string;

    // Security
    fingerprint?: string;

    // State
    status: DeviceStatus;
    type: DeviceType;

    // Metadata
    app_version?: string;
    ip_address?: string;

    // Timestamps
    last_seen_at?: ISODateString;
    created_at: ISODateString;
    updated_at: ISODateString;
}

// Payload for creating a device in Portal
export interface CreateDevicePayload {
    name: string;
    branch_id: UUID;
    type: DeviceType;
}

export type ProvisioningStatus = 'waiting' | 'approved' | 'rejected' | 'expired';

export interface ProvisioningSession {
    id: UUID;
    fingerprint: string;
    device_name?: string;
    ip_address?: string;
    status: ProvisioningStatus;

    // Result
    assigned_branch_id?: UUID;
    expires_at: ISODateString;
    created_at: ISODateString;
}

// POS Request to start session
export interface InitProvisioningPayload {
    fingerprint: string;
    device_name: string;
    ip_address?: string;
}

// Manager Request to approve session
export interface ApproveProvisioningPayload {
    session_id: UUID;
    branch_id: UUID;
    device_name: string; // Allow renaming at approval
}
