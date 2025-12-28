export interface Product {
    id: string; // uuid
    name: string;
    description?: string;
    price: number;
    category?: string;
    active: boolean;
    stock?: number;
    image_url?: string;
    last_synced_at?: string;
}

export interface User {
    id: string; // uuid
    email: string;
    full_name: string;
    role: 'admin' | 'cajero';
}

export interface Sale {
    id: string; // uuid
    branch_id: string;
    shift_id?: string; // Optional shift reference
    created_by: string; // user_id
    markShiftSynced: (id: string) => Promise<void>;
    updateProductStock: (id: string, delta: number) => Promise<void>;
    setProductStock: (id: string, newStock: number) => Promise<void>;
    total_amount: number;
    payment_method: 'cash' | 'card' | 'transfer';
    status: 'completed' | 'voided';
    tip_amount?: number; // Optional tip
    discount_amount?: number; // Optional discount
    created_at: string; // ISO String
    synced: boolean;
}

export interface SaleItem {
    id: string;
    sale_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

export interface Client {
    id: string; // uuid
    full_name: string;
    document_id?: string;
    phone: string;
    email?: string;
    points: number;
    created_at: string;
    updated_at: string;
    synced: boolean;
}


export interface ShiftSummary {
    totalSales: number;
    cashSales: number;
    cardSales: number;
    transferSales: number;
    totalTips: number;
    totalExpenses: number;
    productsSold: { name: string; quantity: number; total: number }[];
    salesCount: number;
}

export interface Expense {
    id: string;
    branch_id: string;
    shift_id?: string;
    user_id: string;
    description: string;
    amount: number;
    category: string;
    voucher_number?: string;
    created_at: string;
    synced: boolean;
}

export interface TipDistribution {
    id: string;
    shift_id: string;
    employee_id: string;
    employee_name?: string;
    amount: number;
    created_at: string;
    synced: boolean;
}
