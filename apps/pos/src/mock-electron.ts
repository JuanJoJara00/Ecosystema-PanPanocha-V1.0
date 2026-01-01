// Mock Electron IPC for Browser Development/Testing
if (typeof window !== 'undefined' && !window.electron) {
    console.warn("⚠️ Running in Browser Mode - Mocking Electron IPC");

    // @ts-ignore
    window.electron = {
        // Generic IPC
        invoke: async (channel: string, ...args: any[]) => { console.log(`[Mock] Invoke ${channel}`, args); return null; },
        on: (channel: string, func: (...args: any[]) => void) => {
            console.log(`[Mock] Listening on ${channel}`);
            return () => { };
        },

        printTicket: async (data: any) => { console.log("[Mock] Print Ticket:", data); },
        printClosing: async (data: any) => { console.log("[Mock] Print Closing:", data); return { success: true }; },
        printSiigoClosing: async (data: any) => { console.log("[Mock] Print Siigo Closing:", data); return { success: true }; },
        printCombinedClosing: async (data: any) => { console.log("[Mock] Print Combined Closing:", data); return { success: true }; },
        printOrderDetails: async (order: any) => { console.log("[Mock] Print Order Details:", order); },

        // Security
        getMachineId: async () => "mock-machine-id",
        encrypt: async (text: string) => `encrypted-${text}`,
        decrypt: async (text: string) => text.replace("encrypted-", ""),

        // Database
        getProducts: async () => [
            { id: '1', name: 'Pan de Bono', price: 2500, category: 'pan', active: true, stock: 50 },
            { id: '2', name: 'Almojábana', price: 2800, category: 'pan', active: true, stock: 30 },
            { id: '3', name: 'Buñuelo', price: 2000, category: 'pan', active: true, stock: 100 },
        ],
        syncProducts: async (products: any[]) => { console.log("[Mock] Sync Products", products.length); },

        getUsers: async () => [
            { id: 'u1', email: 'cajero@panpanocha.com', full_name: 'Cajero Demo', role: 'cajero', organization_id: 'org-1' }
        ],
        syncUsers: async (users: any[]) => { console.log("[Mock] Sync Users", users.length); },

        saveSale: async (sale: any, items: any[]) => { console.log("[Mock] Save Sale", sale, items); },
        getPendingSales: async () => [],
        getAllSales: async () => [],
        getSalesByShift: async (_shiftId: string) => [],
        importSalesBatch: async (sales: any[]) => { console.log("[Mock] Import Sales Batch", sales.length); },
        getProductTrends: async (_days: number) => [],
        getProductTrendsByRange: async (_start: string, _end: string) => [],
        getProductDailyTrends: async (_days: number) => [],
        updateSaleShift: async (saleId: string, shiftId: string) => { console.log("[Mock] Update Sale Shift", saleId, shiftId); },
        resetSalesData: async () => { console.log("[Mock] Reset Sales Data"); },
        markSynced: async (id: string) => { console.log("[Mock] Mark Synced", id); },
        pruneData: async (days: number) => { console.log("[Mock] Prune Data", days); },

        // Clients
        searchClients: async (_query: string) => [],
        createClient: async (client: any) => ({ ...client, id: 'c-' + Date.now() }),
        syncClients: async (clients: any[]) => { console.log("[Mock] Sync Clients", clients.length); },
        getPendingClients: async () => [],
        markClientSynced: async (id: string) => { console.log("[Mock] Mark Client Synced", id); },

        // Branches
        getBranches: async () => [
            { id: 'b1', name: 'Sede Principal', address: 'Calle 123', city: 'Bogotá' },
            { id: 'b2', name: 'Sede Norte', address: 'Carrera 7 #45-21', city: 'Bogotá' },
        ],
        syncBranches: async (branches: any[]) => { console.log("[Mock] Sync Branches", branches.length); },

        // Shifts
        openShift: async (shift: any) => { console.log("[Mock] Open Shift", shift); return { ...shift, id: 'mock-shift-id' }; },
        closeShift: async (_data: any) => { console.log("[Mock] Close Shift", _data); },
        getShift: async () => null,
        getShiftSummary: async (_shiftId: string) => ({
            totalSales: 150000,
            cashSales: 100000,
            cardSales: 50000,
            transferSales: 0,
            totalTips: 10000,
            totalExpenses: 5000,
            productsSold: [],
            salesCount: 15
        }),
        getPendingShifts: async () => [],
        markShiftSynced: async (id: string) => { console.log("[Mock] Mark Shift Synced", id); },
        updateShift: async (id: string, data: any) => { console.log("[Mock] Update Shift", id, data); },

        // Stock Updates
        updateProductStock: async (id: string, delta: number) => { console.log("[Mock] Update Stock", id, delta); },
        setProductStock: async (id: string, newStock: number) => { console.log("[Mock] Set Stock", id, newStock); },

        // Expenses
        createExpense: async (expense: any) => { console.log("[Mock] Create Expense", expense); },
        deleteExpense: async (id: string) => { console.log("[Mock] Delete Expense", id); },
        getExpensesByShift: async (_shiftId: string) => [],
        syncExpenses: async (expenses: any[]) => { console.log("[Mock] Sync Expenses", expenses.length); },
        getPendingExpenses: async () => [],
        markExpenseSynced: async (id: string) => { console.log("[Mock] Mark Expense Synced", id); },
        getAllExpenses: async () => [],

        // Tip Distributions
        createTipDistribution: async (distribution: any) => { console.log("[Mock] Create Tip Distribution", distribution); },
        createTipDistributions: async (distributions: any[]) => { console.log("[Mock] Create Tip Distributions", distributions.length); },
        getTipDistributionsByShift: async (_shiftId: string) => [],
        getTipDistributionsByEmployee: async (_employeeId: string) => [],
        getEmployeeTipsTotal: async (_employeeId: string) => 0,
        getPendingTipDistributions: async () => [],
        markTipDistributionSynced: async (id: string) => { console.log("[Mock] Mark Tip Synced", id); },
        syncTipDistributions: async (distributions: any[]) => { console.log("[Mock] Sync Tips", distributions.length); },
        devGenerateEmployees: async () => { console.log("[Mock] Dev Generate Employees"); },

        // Tables
        getTables: async (_branchId: string) => [
            { id: 't1', branch_id: 'b1', name: 'Mesa 1', status: 'available' },
            { id: 't2', branch_id: 'b1', name: 'Mesa 2', status: 'occupied' },
            { id: 't3', branch_id: 'b1', name: 'Terraza', status: 'available' },
        ],
        createTable: async (table: any) => { console.log("[Mock] Create Table", table); },
        updateTable: async (id: string, data: any) => { console.log("[Mock] Update Table", id, data); },
        deleteTable: async (id: string) => { console.log("[Mock] Delete Table", id); },

        // Orders
        createOrder: async (data: any) => { console.log("[Mock] Create Order", data); },
        getPendingOrder: async (_tableId: string) => { console.log("[Mock] Get Pending Order for", _tableId); return null; },
        updateOrderDiners: async (orderId: string, diners: number) => { console.log("[Mock] Update Diners", orderId, diners); },
        updateOrderTable: async (orderId: string, tableId: string) => { console.log("[Mock] Update Order Table", orderId, tableId); },

        orderAddItem: async (item: any) => { console.log("[Mock] Add Order Item", item); },
        orderUpdateItem: async (itemId: string, quantity: number, _totalPrice: number) => { console.log("[Mock] Update Item", itemId, quantity); },
        orderDeleteItem: async (itemId: string) => { console.log("[Mock] Delete Order Item", itemId); },
        orderGetItems: async (_orderId: string) => [],
        deleteOrder: async (orderId: string) => { console.log("[Mock] Delete Order", orderId); },
        getAllOrders: async () => { console.log("[Mock] Get All Orders"); return []; },
        getSaleItems: async (_saleId: string) => [],

        // Rappi
        createRappiDelivery: async (delivery: any) => ({ ...delivery }),
        getRappiDeliveries: async () => [],
        getPendingRappi: async () => [],
        markRappiSynced: async (id: string) => { console.log("[Mock] Mark Rappi Synced", id); },
        updateRappiStatus: async (id: string, status: string) => { console.log("[Mock] Update Rappi Status", id, status); },

        // Standard Deliveries
        createDelivery: async (delivery: any) => ({ ...delivery }),
        getDeliveries: async () => [],
        getDeliveriesByBranch: async (_branchId: string) => [],
        getPendingDeliveries: async () => [],
        markDeliverySynced: async (id: string) => { console.log("[Mock] Mark Delivery Synced", id); },
        updateDeliveryStatus: async (id: string, status: string) => { console.log("[Mock] Update Delivery Status", id, status); },
        syncDeliveries: async (items: any[]) => { console.log("[Mock] Sync Deliveries", items.length); },

        // Stock Reservations
        addReservation: async (productId: string, quantity: number, _sourceType: string, _sourceId: string) => { console.log("[Mock] Add Reservation", productId, quantity); },
        addReservations: async (items: any[], _sourceType: string, _sourceId: string) => { console.log("[Mock] Add Reservations", items.length); },
        removeReservation: async (_sourceType: string, _sourceId: string) => 0,
        getReservations: async () => ({}),
        clearReservations: async () => 0,
        markReservationConfirmed: async (_sourceType: string, _sourceId: string) => 0,
        cleanupExpiredReservations: async (_olderThanMinutes: number = 60) => ({ removed: 0, items: [] }),
        clearConfirmedReservations: async () => 0,

        // DEV ONLY
        devResetAndGenerateMockData: async () => {
            console.log("[Mock] Generating Mock Data Utility...");
            return { success: true, count: 300 };
        }
    };
}

