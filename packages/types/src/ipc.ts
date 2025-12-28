
import { Sale, SaleItem } from './sale';
import { Shift } from './shift';
import { Product } from './product';
import { Delivery, RappiDelivery } from './delivery'; // Assuming these exist
import { User } from './user';
import { Client } from './client';
import { Expense } from './shift'; // Expense is defined in shift.ts
import { TipDistribution } from './shift'; // Assuming existence
import { Order } from './order';

export interface IPCHandlers {
    // Sales
    'db-save-sale': (sale: Sale, items: SaleItem[]) => Promise<{ success: boolean }>;
    'db-get-pending-sales': () => Promise<Sale[]>;
    'db-get-all-sales': () => Promise<Sale[]>;
    'db-get-sales-by-shift': (shiftId: string) => Promise<Sale[]>;
    'db-update-sale-shift': (data: { saleId: string; shiftId: string }) => Promise<void>;
    'db-import-sales-batch': (sales: Sale[]) => Promise<void>;
    'db-mark-synced': (saleId: string) => Promise<void>;

    // Products / Stock
    'db:get-products': (params: { skip: number; take: number; search?: string; categoryId?: string }) => Promise<{ products: Product[]; total: number }>;

    // Shifts
    'db-open-shift': (shift: Shift) => Promise<{ status: string; shift?: Shift }>;
    'db-close-shift': (data: { id: string; endTime: string; finalCash: number; expectedCash: number }) => Promise<void>;
    'db-get-shift': () => Promise<Shift | null>;
    'db-get-shift-summary': (shiftId: string) => Promise<{
        totalSales: number;
        cashSales: number;
        cardSales: number;
        transferSales: number;
        totalTips: number;
        totalExpenses: number;
        productsSold: any[];
        salesCount: number;
    }>;

    // ... Add more as we migrate
}
