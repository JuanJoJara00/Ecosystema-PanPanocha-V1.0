/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_POWERSYNC_URL: string;
    readonly VITE_POWERSYNC_TOKEN: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

import {
    Product, User, Sale, SaleItem, Client, Shift, Expense,
    TipDistribution, Table, Order, Delivery, RappiDelivery
} from './types';

declare global {
    interface Window {
        electron: {
            // Generic IPC
            invoke: (channel: string, ...args: any[]) => Promise<any>;
            on: (channel: string, func: (...args: any[]) => void) => () => void;

            // Printing
            printTicket: (data: { sale?: Sale; items: SaleItem[] | any[]; client?: Client; paymentData?: { received: number; change: number }; diners?: number; target?: 'receipt' | 'kitchen'; metadata?: any }) => Promise<void>;
            printClosing: (closingData: any) => Promise<{ success: boolean; message?: string; filePath?: string }>;
            printSiigoClosing: (closingData: any) => Promise<{ success: boolean; message?: string; filePath?: string }>;
            printCombinedClosing: (data: { date: string; shifts: string[]; summary: any }) => Promise<{ success: boolean; filePath?: string }>;
            printOrderDetails: (order: Order & { items: any[] }) => Promise<void>;

            // System Security
            getMachineId: () => Promise<string>;
            encrypt: (text: string) => Promise<string>;
            decrypt: (text: string) => Promise<string>;

            // DB - Core
            getProducts: (params?: any) => Promise<any>; // Update return type to generic or PaginatedResponse
            syncProducts: (products: Product[]) => Promise<void>;
            getUsers: () => Promise<User[]>;
            syncUsers: (users: User[]) => Promise<void>;

            // Sales
            saveSale: (sale: Sale, items: SaleItem[]) => Promise<void>;
            getPendingSales: () => Promise<Sale[]>;
            getAllSales: () => Promise<Sale[]>;
            getSalesByShift: (shiftId: string) => Promise<Sale[]>;
            importSalesBatch: (sales: Sale[]) => Promise<void>;
            updateSaleShift: (saleId: string, shiftId: string) => Promise<void>;
            resetSalesData: () => Promise<void>;
            markSynced: (id: string) => Promise<void>;

            // Analytics
            pruneData: (days: number) => Promise<void>;
            getProductTrends: (days: number) => Promise<any[]>;
            getProductTrendsByRange: (start: string, end: string) => Promise<any[]>;
            getProductDailyTrends: (days: number) => Promise<any[]>;

            // Clients
            searchClients: (query: string) => Promise<Client[]>;
            createClient: (client: Client) => Promise<Client>;
            syncClients: (clients: Client[]) => Promise<void>;
            getPendingClients: () => Promise<Client[]>;
            markClientSynced: (id: string) => Promise<void>;

            // Branches
            getBranches: () => Promise<any[]>;
            syncBranches: (branches: any[]) => Promise<void>;

            // Shifts
            openShift: (shift: Shift) => Promise<Shift>;
            closeShift: (data: { id: string, endTime: string, finalCash: number, expectedCash: number, closing_metadata?: any }) => Promise<void>;
            getShift: () => Promise<Shift | null>;
            getShiftSummary: (shiftId: string) => Promise<{
                totalSales: number;
                cashSales: number;
                cardSales: number;
                transferSales: number;
                totalTips: number;
                totalExpenses: number;
                productsSold: any[];
                salesCount: number;
            }>;
            getPendingShifts: () => Promise<Shift[]>;
            markShiftSynced: (id: string) => Promise<void>;
            updateShift: (id: string, data: any) => Promise<void>;
            updateShiftHeartbeat: (shiftId: string) => Promise<void>;

            // Stock
            updateProductStock: (id: string, delta: number) => Promise<void>;
            setProductStock: (id: string, newStock: number) => Promise<void>;

            // Expenses
            createExpense: (expense: Expense) => Promise<void>;
            deleteExpense: (id: string) => Promise<void>;
            getExpensesByShift: (shiftId: string) => Promise<Expense[]>;
            syncExpenses: (expenses: Expense[]) => Promise<void>;
            getPendingExpenses: () => Promise<Expense[]>;
            markExpenseSynced: (id: string) => Promise<void>;
            getAllExpenses: () => Promise<Expense[]>;

            // Tip Distributions
            createTipDistribution: (distribution: TipDistribution) => Promise<void>;
            createTipDistributions: (distributions: TipDistribution[]) => Promise<void>;
            getTipDistributionsByShift: (shiftId: string) => Promise<TipDistribution[]>;
            getTipDistributionsByEmployee: (employeeId: string) => Promise<TipDistribution[]>;
            getEmployeeTipsTotal: (employeeId: string) => Promise<number>;
            getPendingTipDistributions: () => Promise<TipDistribution[]>;
            markTipDistributionSynced: (id: string) => Promise<void>;
            syncTipDistributions: (distributions: TipDistribution[]) => Promise<void>;
            devGenerateEmployees: () => Promise<void>;

            // Tables
            getTables: (branchId: string) => Promise<Table[]>;
            createTable: (table: Table) => Promise<void>;
            updateTable: (id: string, data: Partial<Table>) => Promise<void>;
            deleteTable: (id: string) => Promise<void>;

            // Orders
            createOrder: (data: { order: Order; items: any[] }) => Promise<void>;
            getPendingOrder: (tableId: string) => Promise<Order | null>;
            updateOrderDiners: (orderId: string, diners: number) => Promise<void>;
            updateOrderTable: (orderId: string, tableId: string) => Promise<void>;
            orderAddItem: (item: any) => Promise<void>;
            orderUpdateItem: (itemId: string, quantity: number, totalPrice: number) => Promise<void>;
            orderDeleteItem: (itemId: string) => Promise<void>;
            orderGetItems: (orderId: string) => Promise<any[]>;
            deleteOrder: (orderId: string) => Promise<void>;
            getAllOrders: () => Promise<Order[]>;
            getSaleItems: (saleId: string) => Promise<SaleItem[]>;

            // Rappi
            createRappiDelivery: (delivery: RappiDelivery) => Promise<RappiDelivery>;
            getRappiDeliveries: () => Promise<RappiDelivery[]>;
            getPendingRappi: () => Promise<RappiDelivery[]>;
            markRappiSynced: (id: string) => Promise<void>;
            updateRappiStatus: (id: string, status: string) => Promise<void>;

            // Standard Deliveries
            createDelivery: (delivery: Delivery) => Promise<Delivery>;
            getDeliveries: () => Promise<Delivery[]>;
            getDeliveriesByBranch: (branchId: string) => Promise<Delivery[]>;
            getPendingDeliveries: () => Promise<Delivery[]>;
            markDeliverySynced: (id: string) => Promise<void>;
            updateDeliveryStatus: (id: string, status: string) => Promise<void>;
            syncDeliveries: (items: Delivery[]) => Promise<void>;

            // Stock Reservations (Complex types kept simple for now)
            addReservation: (productId: string, quantity: number, sourceType: string, sourceId: string) => Promise<void>;
            addReservations: (items: { productId: string; quantity: number }[], sourceType: string, sourceId: string) => Promise<void>;
            removeReservation: (sourceType: string, sourceId: string) => Promise<number>;
            getReservations: () => Promise<Record<string, number>>;
            clearReservations: () => Promise<number>;
            markReservationConfirmed: (sourceType: string, sourceId: string) => Promise<number>;
            cleanupExpiredReservations: (olderThanMinutes?: number) => Promise<{ removed: number; items: any[] }>;
            clearConfirmedReservations: () => Promise<number>;

            // Authentication
            setAuthToken: (token: string) => Promise<boolean>;

            // DEV ONLY
            devResetAndGenerateMockData: () => Promise<{ success: boolean }>;
        }
    }
}
