// Common utility types
export type UUID = string;
export type ISODateString = string;

export interface PaginationParams {
    page?: number;
    limit?: number;
    offset?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
    success: boolean;
}

export type SortOrder = 'asc' | 'desc';

export interface SortParams {
    sortBy?: string;
    sortOrder?: SortOrder;
}
