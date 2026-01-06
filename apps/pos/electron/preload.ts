import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    // Generic IPC for React Hooks (Phase 3 Modernization)
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, func: (...args: any[]) => void) => {
        const subscription = (_event: any, ...args: any[]) => func(...args);
        ipcRenderer.on(channel, subscription);
        return () => ipcRenderer.removeListener(channel, subscription);
    },

    printTicket: (saleData: any) => ipcRenderer.invoke('print-ticket', saleData),
    printKitchen: (data: any) => ipcRenderer.invoke('print-kitchen', data),

    // Auth & Sync
    setAuthToken: (token: string) => ipcRenderer.invoke('auth-set-token', token),

    // --- Legacy Database Methods (Keep for now) ---
    printClosing: (closingData: any) => ipcRenderer.invoke('print-closing', closingData),
    printSiigoClosing: (closingData: any) => ipcRenderer.invoke('print-siigo-closing', closingData),
    printOrderDetails: (closingData: any) => ipcRenderer.invoke('print-order-details', closingData),

    // System
    getMachineId: () => ipcRenderer.invoke('get-machine-id'),
    encrypt: (text: string) => ipcRenderer.invoke('security-encrypt', text),
    decrypt: (text: string) => ipcRenderer.invoke('security-decrypt', text),

    // Database
    getProducts: (params?: any) => ipcRenderer.invoke('db:get-products', params),
    syncProducts: (products: any[]) => ipcRenderer.invoke('db-sync-products', products),

    getUsers: () => ipcRenderer.invoke('db-get-users'),
    syncUsers: (users: any[]) => ipcRenderer.invoke('db-sync-users', users),
    devGenerateEmployees: () => ipcRenderer.invoke('dev-generate-employees'),

    saveSale: (sale: any, items: any[]) => ipcRenderer.invoke('db-save-sale', { sale, items }),
    getPendingSales: () => ipcRenderer.invoke('db-get-pending-sales'),
    getAllSales: () => ipcRenderer.invoke('db-get-all-sales'),
    getSalesByShift: (shiftId: string) => ipcRenderer.invoke('db-get-sales-by-shift', shiftId),
    importSalesBatch: (sales: any[]) => ipcRenderer.invoke('db-import-sales-batch', sales),
    pruneData: (days: number) => ipcRenderer.invoke('db-prune-data', days),
    getProductTrends: (days: number) => ipcRenderer.invoke('db-get-product-trends', days),
    getProductTrendsByRange: (start: string, end: string) => ipcRenderer.invoke('db-get-product-trends-by-range', { start, end }),
    getProductDailyTrends: (days: number) => ipcRenderer.invoke('db-get-product-daily-trends', days),
    updateSaleShift: (saleId: string, shiftId: string) => ipcRenderer.invoke('db-update-sale-shift', { saleId, shiftId }),
    resetSalesData: () => ipcRenderer.invoke('db-reset-sales'),
    markSynced: (saleId: string) => ipcRenderer.invoke('db-mark-synced', saleId),

    // Clients
    searchClients: (query: string) => ipcRenderer.invoke('db-search-clients', query),
    createClient: (client: any) => ipcRenderer.invoke('db-create-client', client),
    syncClients: (clients: any[]) => ipcRenderer.invoke('db-sync-clients', clients),
    getPendingClients: () => ipcRenderer.invoke('db-get-pending-clients'),
    markClientSynced: (id: string) => ipcRenderer.invoke('db-mark-client-synced', id),

    // Branches
    getBranches: () => ipcRenderer.invoke('db-get-branches'),
    syncBranches: (branches: any[]) => ipcRenderer.invoke('db-sync-branches', branches),

    // Shifts
    openShift: (shift: any) => ipcRenderer.invoke('db-open-shift', shift),
    closeShift: (data: any) => ipcRenderer.invoke('db-close-shift', data),
    getShift: () => ipcRenderer.invoke('db-get-shift'),
    getShiftSummary: (shiftId: string) => ipcRenderer.invoke('db-get-shift-summary', shiftId),
    getPendingShifts: () => ipcRenderer.invoke('db-get-pending-shifts'),
    markShiftSynced: (id: string) => ipcRenderer.invoke('db-mark-shift-synced', id),
    updateShift: (id: string, data: any) => ipcRenderer.invoke('db-update-shift', { id, data }),
    updateShiftHeartbeat: (shiftId: string) => ipcRenderer.invoke('db-update-shift-heartbeat', shiftId),
    getAllShifts: (limit?: number) => ipcRenderer.invoke('db-get-all-shifts', limit),
    updateProductStock: (id: string, delta: number) => ipcRenderer.invoke('update-product-stock', id, delta),
    setProductStock: (id: string, newStock: number) => ipcRenderer.invoke('set-product-stock', id, newStock),

    // Expenses
    createExpense: (expense: any) => ipcRenderer.invoke('db-create-expense', expense),
    getExpensesByShift: (shiftId: string) => ipcRenderer.invoke('db-get-expenses-by-shift', shiftId),
    getAllExpenses: () => ipcRenderer.invoke('db-get-all-expenses'),
    deleteExpense: (id: string) => ipcRenderer.invoke('db-delete-expense', id),
    syncExpenses: (expenses: any[]) => ipcRenderer.invoke('db-sync-expenses', expenses),
    getPendingExpenses: () => ipcRenderer.invoke('db-get-pending-expenses'),
    markExpenseSynced: (id: string) => ipcRenderer.invoke('db-mark-expense-synced', id),

    // Tip Distributions
    createTipDistribution: (distribution: any) => ipcRenderer.invoke('db-create-tip-distribution', distribution),
    createTipDistributions: (distributions: any[]) => ipcRenderer.invoke('db-create-tip-distributions', distributions),
    getTipDistributionsByShift: (shiftId: string) => ipcRenderer.invoke('db-get-tip-distributions-by-shift', shiftId),
    getTipDistributionsByEmployee: (employeeId: string) => ipcRenderer.invoke('db-get-tip-distributions-by-employee', employeeId),
    getEmployeeTipsTotal: (employeeId: string) => ipcRenderer.invoke('db-get-employee-tips-total', employeeId),
    getPendingTipDistributions: () => ipcRenderer.invoke('db-get-pending-tip-distributions'),
    markTipDistributionSynced: (id: string) => ipcRenderer.invoke('db-mark-tip-distribution-synced', id),
    syncTipDistributions: (distributions: any[]) => ipcRenderer.invoke('db-sync-tip-distributions', distributions),

    // Tables
    getTables: (branchId: string) => ipcRenderer.invoke('db-get-tables', branchId),
    createTable: (table: any) => ipcRenderer.invoke('db-create-table', table),
    updateTable: (id: string, data: any) => ipcRenderer.invoke('db-update-table', { id, data }),
    deleteTable: (id: string) => ipcRenderer.invoke('db-delete-table', id),

    // Orders
    createOrder: (data: any) => ipcRenderer.invoke('db-create-order', data),
    getPendingOrder: (tableId: string) => ipcRenderer.invoke('db-get-pending-order', tableId),
    updateOrderDiners: (orderId: string, diners: number) => ipcRenderer.invoke('db-update-order-diners', { orderId, diners }),
    updateOrderTable: (orderId: string, tableId: string) => ipcRenderer.invoke('db-update-order-table', { orderId, tableId }),

    orderAddItem: (item: any) => ipcRenderer.invoke('db-order-add-item', item),
    orderUpdateItem: (itemId: string, quantity: number, totalPrice: number) => ipcRenderer.invoke('db-order-update-item', { itemId, quantity, totalPrice }),
    orderDeleteItem: (itemId: string) => ipcRenderer.invoke('db-order-delete-item', itemId),
    orderGetItems: (orderId: string) => ipcRenderer.invoke('db-order-get-items', orderId),
    deleteOrder: (orderId: string) => ipcRenderer.invoke('db-delete-order', orderId),
    getAllOrders: () => ipcRenderer.invoke('db-get-all-orders'),
    getSaleItems: (saleId: string) => ipcRenderer.invoke('db-get-sale-items', saleId),

    // Rappi
    createRappiDelivery: (delivery: any) => ipcRenderer.invoke('db-create-rappi-delivery', delivery),
    getRappiDeliveries: () => ipcRenderer.invoke('db-get-rappi-deliveries'),
    getPendingRappi: () => ipcRenderer.invoke('db-get-pending-rappi'),
    markRappiSynced: (id: string) => ipcRenderer.invoke('db-mark-rappi-synced', id),
    updateRappiStatus: (id: string, status: string) => ipcRenderer.invoke('db-update-rappi-status', { id, status }),

    // Standard Deliveries
    createDelivery: (delivery: any) => ipcRenderer.invoke('db-create-delivery', delivery),
    getDeliveries: () => ipcRenderer.invoke('db-get-deliveries'),
    getDeliveriesByBranch: (branchId: string) => ipcRenderer.invoke('db-get-deliveries-by-branch', branchId),
    getPendingDeliveries: () => ipcRenderer.invoke('db-get-pending-deliveries'),
    markDeliverySynced: (id: string) => ipcRenderer.invoke('db-mark-delivery-synced', id),
    updateDeliveryStatus: (id: string, status: string) => ipcRenderer.invoke('db-update-delivery-status', { id, status }),
    syncDeliveries: (items: any[]) => ipcRenderer.invoke('db-sync-deliveries', items),

    // Stock Reservations
    addReservation: (productId: string, quantity: number, sourceType: string, sourceId: string) =>
        ipcRenderer.invoke('add-reservation', productId, quantity, sourceType, sourceId),
    addReservations: (items: { productId: string; quantity: number }[], sourceType: string, sourceId: string) =>
        ipcRenderer.invoke('add-reservations', items, sourceType, sourceId),
    removeReservation: (sourceType: string, sourceId: string) =>
        ipcRenderer.invoke('remove-reservation', sourceType, sourceId),
    getReservations: () => ipcRenderer.invoke('get-reservations'),
    clearReservations: () => ipcRenderer.invoke('clear-reservations'),
    markReservationConfirmed: (sourceType: string, sourceId: string) =>
        ipcRenderer.invoke('mark-reservation-confirmed', sourceType, sourceId),
    cleanupExpiredReservations: (olderThanMinutes: number = 60) =>
        ipcRenderer.invoke('cleanup-expired-reservations', olderThanMinutes),
    clearConfirmedReservations: () => ipcRenderer.invoke('clear-confirmed-reservations'),

    // DEV ONLY: Reset and generate mock data
    devResetAndGenerateMockData: () => ipcRenderer.invoke('dev-reset-and-generate-mock-data'),
});
