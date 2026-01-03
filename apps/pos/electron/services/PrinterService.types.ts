/**
 * Type definitions for PrinterService data structures.
 * Critical fields are required to ensure data integrity during printing.
 */

export interface ClosingData {
    shift: {
        id: string;
        initial_cash: number;
        turn_type?: string;
        created_at?: string;
        end_time?: string;
    };
    branch?: {
        name: string;
    };
    user?: {
        full_name: string;
    };
    summary: {
        totalSales: number;
        cashSales: number;
        cardSales: number;
        transferSales: number;
        totalExpenses: number;
        salesCount: number;
        totalTips?: number;
    };
    cashCount: number;
    cashCounts?: Record<number | string, number>;
    difference: number;
    cashToDeliver: number;
    closingType?: string;
    productsSold?: Array<{
        name: string;
        quantity: number;
    }>;
}

export interface OrderDetailsData {
    items: Array<{
        name: string;
        quantity: number;
        price: number;
        [key: string]: unknown; // More type-safe than 'any' for extra fields
    }>;
    user?: {
        full_name?: string;
    };
    metadata?: Record<string, unknown>; // For extra top-level fields
}

export interface CombinedClosingData {
    shift?: {
        name?: string;
        id?: string;
    };
    user?: {
        full_name?: string;
    };
    summary: {
        totalBase: number;
        totalCashSales: number;
        totalExpenses: number;
        tipsDelivered?: number;
        expectedCash: number;
        realCash: number;
        difference: number;
        cashToDeliver: number;
        totalCard: number;
        totalTransfer: number;
    };
}

export interface PrintTicketData {
    sale: {
        id: string;
        created_at: string;
        total_amount: number;
        shift_id?: string;
        branch_id?: string;
        created_by?: string;
        [key: string]: unknown;
    };
    items: Array<{
        quantity: number;
        name?: string;
        product_name?: string;
        unit_price?: number;
        total_price?: number;
        notes?: string;
        [key: string]: unknown;
    }>;
    client?: Record<string, unknown>;
    paymentData?: Record<string, unknown>;
    branch?: {
        name: string;
        [key: string]: unknown;
    };
    user?: {
        full_name: string;
        [key: string]: unknown;
    };
}
