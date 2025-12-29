import type { UUID, ISODateString, TenantEntity } from './common';
import type { Product } from './product';

export type ShiftStatus = 'open' | 'closed';

export interface Shift extends TenantEntity {
    id: UUID;
    branch_id: UUID;
    user_id: UUID;

    // Timings
    start_time: ISODateString;
    end_time?: ISODateString;
    turn_type?: string;

    // Money
    initial_cash: number;
    final_cash?: number;
    expected_cash?: number; // Calculated (initial_cash + sales - expenses)

    status: ShiftStatus;
    observations?: string;
    closing_metadata?: any; // JSON containing siigo/mys data

    created_at: ISODateString;
    updated_at: ISODateString;
    synced: boolean;
}

export interface Expense extends TenantEntity {
    id: UUID;
    branch_id: UUID;
    shift_id: UUID;
    user_id: UUID;
    amount: number;
    description: string;
    category: 'propinas' | 'suministros' | 'servicios' | 'nómina' | 'arriendo' | 'domicilios' | 'otros' | string;
    voucher_number?: string;
    created_at: ISODateString;
    synced: boolean;
}

export interface TipDistribution extends TenantEntity {
    id: UUID;
    shift_id: UUID;
    employee_id: UUID;
    employee_name: string;
    amount: number;
    created_at?: ISODateString;
    synced?: boolean;
}

// --- Closing Logic Types ---

export interface CashCount {
    [denomination: number]: number;
}

export interface FinancialSummary {
    totalSales: number;
    cashSales: number;
    cardSales: number;
    transferSales: number;
    expenses: number;
    tips: number;
    baseCash: number;
    finalCash: number;
    expectedCash: number;
    difference: number;
}

export interface ClosingData extends Partial<FinancialSummary> {
    cashToDeliver?: number;
    shift_id?: string;
    // Legacy support while refactoring
    [key: string]: any;
}

export interface ClosingProduct {
    product_id: string;
    name: string;
    quantity: number;
    price: number;
}

export interface ClosingSession {
    panpanocha: {
        completed: boolean;
        cashCounts: CashCount;
        savedData?: ClosingData;
    };
    siigo: {
        completed: boolean;
        step: number;
        formData: {
            shift: string;
            initial_cash: number;
            sales_cash: number;
            sales_card: number;
            sales_transfer: number;
            tips: number;
        };
        productsSold: ClosingProduct[];
        expensesList: { description: string; amount: number }[];
        cashCounts: CashCount;
        savedData?: ClosingData;
    };
    tips: {
        completed: boolean;
        distributions?: { deliveredAmount: number; transferredAmount: number };
    };
}
