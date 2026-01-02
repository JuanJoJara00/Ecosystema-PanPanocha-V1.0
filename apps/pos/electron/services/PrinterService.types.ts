export interface ClosingData {
    shift?: {
        id?: string;
        initial_cash?: number;
        turn_type?: string;
        created_at?: string;
        end_time?: string;
    };
    branch?: {
        name?: string;
    };
    user?: {
        full_name?: string;
    };
    summary?: {
        totalSales?: number;
        cashSales?: number;
        cardSales?: number;
        transferSales?: number;
        totalExpenses?: number;
        salesCount?: number;
        totalTips?: number; // Added based on context usage
    };
    cashCount?: number;
    cashCounts?: Record<number | string, number>;
    difference?: number;
    cashToDeliver?: number;
    closingType?: string;
    productsSold?: Array<{
        name?: string;
        quantity?: number;
    }>;
}

export interface OrderDetailsData {
    items: Array<{
        name?: string;
        quantity?: number;
        price?: number;
    }>;
    user?: {
        full_name?: string;
    };
    // Allow extra fields if needed
    [key: string]: any;
}

export interface CombinedClosingData {
    shift?: {
        name?: string;
    };
    user?: {
        full_name?: string;
    };
    summary: {
        totalBase?: number;
        totalCashSales?: number;
        totalExpenses?: number;
        tipsDelivered?: number;
        expectedCash?: number;
        realCash?: number;
        difference?: number;
        cashToDeliver?: number;
        totalCard?: number;
        totalTransfer?: number;
    };
}
