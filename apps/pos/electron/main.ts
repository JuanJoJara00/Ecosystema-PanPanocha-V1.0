import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { z } from 'zod'; // Security Validation
import { resetAndGenerateMockData, generateMockEmployees } from './dev-reset-data';
import { PrinterService } from './services/PrinterService'; // Worker Manager
import { SecurityManager } from './security';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

// MONKEY PATCH: Prevent "second handler" error during hot-reloads
const originalHandle = ipcMain.handle;
(ipcMain as any).handle = (channel: string, listener: any) => {
    ipcMain.removeHandler(channel);
    return originalHandle.call(ipcMain, channel, listener);
};

// --- Sync Service Integration ---
// import { SyncService } from './services/SyncService'; // REMOVED
import { connector } from './db/index';

// Initialize Sync Service
// SyncService.start(); // REMOVED - PowerSync handles this

ipcMain.handle('auth-set-token', (event, token: string) => {
    console.log('[Main] Auth Token Received for PowerSync Connector');
    connector.setToken(token);
    // Optionally set Branch ID if available in token or separate call
    // connector.setBranchId(...); 
    return true;
});

// Initialize DB
import { initDatabase, getDb } from './db/index';
import Database from 'better-sqlite3';
// Legacy imports kept for now during Strangler Migration
import { products, sales, saleItems, orders, orderItems, shifts, expenses, tipDistributions, branches, users } from './db/schema';
import { count, like, eq, and, sql, desc, sum } from 'drizzle-orm';
import { SalesController } from './controllers/SalesController';
import { ShiftController } from './controllers/ShiftController';
import { InventoryController } from './controllers/InventoryController';
import { ClientController } from './controllers/ClientController';
import { TableController } from './controllers/TableController';
import { DeliveryController } from './controllers/DeliveryController';
import { ReservationController } from './controllers/ReservationController';
import { BranchController } from './controllers/BranchController';
import { UserController } from './controllers/UserController';
import { SystemController } from './controllers/SystemController';

// Controllers (Global Declaration for IPC Access)
let salesController: SalesController;
let shiftController: ShiftController;
let inventoryController: InventoryController;
let clientController: ClientController;
let tableController: TableController;
let deliveryController: DeliveryController;
let reservationController: ReservationController;
let branchController: BranchController;
let userController: UserController;
let systemController: SystemController;

// Async Init Wrapper
const dbInitPromise = (async () => {
    try {
        console.log('[Main] Starting new DB Layer...');
        await initDatabase();
        const db = getDb();

        // Initialize Controllers (moved from global scope)
        salesController = new SalesController(db);
        shiftController = new ShiftController(db);
        inventoryController = new InventoryController(db);
        clientController = new ClientController(db);
        tableController = new TableController(db);
        deliveryController = new DeliveryController(db);
        reservationController = new ReservationController(db);
        branchController = new BranchController(db);
        userController = new UserController(db);
        systemController = new SystemController(db);

        // Initialize legacy DB in parallel for now
        // initDB(); // Migrated to Drizzle/PowerSync

        // initDB(); // Migrated to Drizzle/PowerSync

        // Register IPC Handlers NOW that controllers are ready
        registerHandlers();
        registerBottomHandlers();

        console.log('[Main] IPC Handlers Registered.');

    } catch (e: any) {
        console.error("Failed to init DB:", e);
        dialog.showErrorBox("DB Init Failed", e.toString());
    }
})();


function registerHandlers() {
    const safeHandle = (channel: string, listener: any) => {
        ipcMain.removeHandler(channel);
        ipcMain.handle(channel, listener);
    };

    // --- NEW IPC HANDLERS (DRIZZLE) ---

    // Generic Pagination Handler Helper
    const handlePaginated = async (msg: string, table: any, params: any, searchCol?: any, categoryCol?: any) => {
        try {
            // Validation
            const schema = z.object({
                page: z.number().min(1).default(1),
                pageSize: z.number().min(1).max(100).default(50),
                search: z.string().optional(),
                category: z.string().optional()
            });
            const { page, pageSize, search, category } = schema.parse(params || {});
            const offset = (page - 1) * pageSize;

            const db = getDb();

            // Conditions
            const filters = [];
            if (search && searchCol) filters.push(like(searchCol, `%${search}%`));
            if (category && category !== 'all' && categoryCol) filters.push(eq(categoryCol, category));

            const finalCondition = filters.length > 0 ? and(...filters) : undefined;

            const data = await db.select().from(table)
                .where(finalCondition)
                .limit(pageSize)
                .offset(offset);

            // Count query
            const [totalRes] = await db.select({ count: count() }).from(table).where(finalCondition);

            return {
                data,
                total: totalRes?.count || 0,
                page,
                pageSize,
                totalPages: Math.ceil((totalRes?.count || 0) / pageSize)
            };
        } catch (e: any) {
            console.error(`[IPC] Error in ${msg}:`, e);
            return { error: e.message, data: [] };
        }
    };

    ipcMain.handle('db:get-products', async (_, params) => {
        // HYBRID LEGACY: If no params, return full array
        if (!params) {
            const db = getDb();
            return await db.select().from(products);
        }
        return handlePaginated('db:get-products', products, params, products.name, products.category);
    });
};

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true, // SECURE: Enabled
            sandbox: false, // Keeping false for now to avoid breaking other native modules (sqlite3) if not ready. Re-evaluate in Phase 2.
            // Note: 'sandbox: true' with better-sqlite3 requires ensuring the module is N-API or Context Aware and loaded correctly.
            // Given the risk of breaking DB access in this step, we stick to contextIsolation: true which is the big win.
        },
    });

    // Dev vs Prod
    if (!app.isPackaged) {
        // Fallback to localhost if env var is missing (common in some setups)
        const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
        console.log("Loading Dev URL:", devUrl);
        mainWindow.loadURL(devUrl);
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
};

app.on('ready', async () => {
    await dbInitPromise;

    // --- SEEDING for Dev/MVP ---
    try {
        const db = getDb();
        const branchCount = await db.select({ count: count() }).from(branches);
        if (branchCount[0].count === 0) {
            console.log('[Seed] Database empty, seeding default data...');
            const branchId = 'branch_' + Math.random().toString(36).substr(2, 9);
            const userId = 'user_' + Math.random().toString(36).substr(2, 9);

            await db.insert(branches).values({
                id: branchId,
                organization_id: 'org_default',
                name: 'Sede Principal',
                city: 'Bogotá',
                address: 'Calle 123 # 45-67',
                phone: '3001234567'
            });

            await db.insert(users).values({
                id: userId,
                organization_id: 'org_default',
                full_name: 'Administrador P.P',
                role: 'admin',
                email: 'admin@panpanocha.com'
            });

            console.log('[Seed] Default Branch and User inserted.');
        }
    } catch (e) {
        console.error('[Seed] Failed to seed DB:', e);
    }
    // ---------------------------

    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        await dbInitPromise;
        createWindow();
    }
});

/**
 * Registers IPC handlers for low-level application services used by the renderer.
 *
 * This sets up channels for machine identification, product stock updates, security (encrypt/decrypt),
 * reservation lifecycle operations, printing (tickets, kitchen, closings, order details, combined closings),
 * CRUD and sync operations for controllers (users, products, sales, shifts, expenses, deliveries, tables, orders, etc.),
 * and development utilities (reset/generate mock data, generate employees).
 *
 * Handlers delegate to controllers, the PrinterService, SecurityManager, and the database layer as appropriate.
 */
function registerBottomHandlers() {
    ipcMain.handle('get-machine-id', async () => {
        try {
            const { machineId } = require('node-machine-id');
            const id = await machineId();
            return id;
        } catch (error) {
            console.error('Failed to get machine ID:', error);
            return 'fallback-dev-id-' + Math.random().toString(36).substring(7);
        }
    });

    // Product Stock Handlers
    ipcMain.handle('update-product-stock', async (_event, id, delta) => {
        // ProductDAO.updateStock(id, delta);
        const db = getDb();
        await db.update(products)
            .set({ stock: sql`${products.stock} + ${delta}` })
            .where(eq(products.id, id));
    });

    // Security IPC

    ipcMain.handle('security-encrypt', async (_event, text) => {
        try {
            return SecurityManager.encrypt(text);
        } catch (e) {
            console.error('Encryption failed:', e);
            throw e;
        }
    });
    ipcMain.handle('security-decrypt', async (_event, text) => {
        try {
            return SecurityManager.decrypt(text);
        } catch (e) {
            console.error('Decryption failed:', e);
            throw e;
        }
    });

    ipcMain.handle('set-product-stock', async (_event, id, newStock) => {
        // ProductDAO.setStock(id, newStock);
        const db = getDb();
        await db.update(products)
            .set({ stock: newStock })
            .where(eq(products.id, id));
    });

    // Reservation IPC handlers
    ipcMain.handle('add-reservation', async (_event, productId, quantity, sourceType, sourceId) => {
        reservationController.add(productId, quantity, sourceType, sourceId);
    });

    ipcMain.handle('add-reservations', async (_event, items, sourceType, sourceId) => {
        reservationController.addMany(items, sourceType, sourceId);
    });

    ipcMain.handle('remove-reservation', async (_event, sourceType, sourceId) => {
        return reservationController.removeBySource(sourceType, sourceId);
    });

    ipcMain.handle('db-get-reservation-product-quantities', () => reservationController.getAllReserved());
    ipcMain.handle('db-cleanup-reservations', (e, olderThanMinutes) => reservationController.cleanupExpiredPending(olderThanMinutes));
    ipcMain.handle('db-reset-sales', () => systemController.resetSalesData());

    ipcMain.handle('get-reservations', async () => {
        return reservationController.getAllReserved();
    });

    ipcMain.handle('clear-reservations', async () => {
        return reservationController.clearAll();
    });

    ipcMain.handle('mark-reservation-confirmed', async (_event, sourceType, sourceId) => {
        return reservationController.markConfirmed(sourceType, sourceId);
    });

    ipcMain.handle('cleanup-expired-reservations', async (_event, olderThanMinutes) => {
        return reservationController.cleanupExpiredPending(olderThanMinutes || 60);
    });

    ipcMain.handle('clear-confirmed-reservations', async () => {
        return reservationController.clearConfirmed();
    });

    // === SECURE PRINTING IPC ===

    // Define Validation Schema
    const PrintTicketSchema = z.object({
        sale: z.object({
            id: z.string(),
            created_at: z.string(),
            total_amount: z.number(),
            // Add more fields as strict implementation requires
        }).passthrough(), // Allow other fields to pass through till strictly typed
        items: z.array(z.any()), // Refine this later
        client: z.any().optional(),
        paymentData: z.any().optional(),
        branch: z.any().optional(), // We'll fetch it if missing, but schema allows passing
        user: z.any().optional()
    });

    // === SHARED PRINT LOGIC ===
    const handlePrintRequest = async (rawPayload: any, forceTarget?: 'receipt' | 'kitchen') => {
        console.log(`[Main] Received print request (Force Target: ${forceTarget || 'Auto'})`);
        try {
            // 1. Validation
            const payload = PrintTicketSchema.parse(rawPayload);

            // 2. Data Enrichment
            if (!payload.branch && payload.sale.branch_id) {
                payload.branch = await branchController.get(String(payload.sale.branch_id));
            }
            if (!payload.user && payload.sale.created_by) {
                payload.user = await userController.get(String(payload.sale.created_by));
            }

            // 3. Determine Target
            const target = forceTarget || ((rawPayload.target === 'kitchen') ? 'kitchen' : 'receipt');

            // 4. Delegate to Printer Service
            await PrinterService.getInstance().printTicket(payload, target);

            return { success: true, message: `Print Job Sent to ${target}` };

        } catch (error) {
            console.error(`[Main] Print Error (${forceTarget}):`, error);
            return {
                success: false,
                error: error instanceof z.ZodError ? 'Validation Failed' : (error instanceof Error ? error.message : 'Unknown Error'),
                details: error instanceof z.ZodError ? error.errors : undefined
            };
        }
    };

    ipcMain.handle('print-ticket', async (e, rawPayload) => {
        return handlePrintRequest(rawPayload);
    });

    ipcMain.handle('print-kitchen', async (e, rawPayload) => {
        return handlePrintRequest(rawPayload, 'kitchen');
    });

    // Print Closing Receipt IPC
    // Print Closing Receipt IPC
    ipcMain.handle('print-closing', async (e, closingData) => {
        console.log('[Printer] Generating Closing Receipt via ESC/POS...');
        try {
            await PrinterService.getInstance().printClosing(closingData);
            return { success: true, message: 'Print Job Sent' };
        } catch (error) {
            console.error('[Printer] Closing print failed:', error);
            // dialog.showErrorBox('Error de Impresión', String(error));
            return { success: false, error: String(error) };
        }
    });

    // Print Siigo Closing Receipt IPC
    // Print Siigo Closing Receipt IPC
    ipcMain.handle('print-siigo-closing', async (e, closingData) => {
        console.log('[Printer] Generating Siigo Closing via ESC/POS...');
        try {
            // Map Siigo data to standard closing data
            const {
                shift, branch, user,
                sales_cash, sales_card, sales_transfer,
                expenses, finalCash, difference, products, cashCounts
            } = closingData;

            const totalExpenses = (expenses || []).reduce((acc: any, curr: any) => acc + (curr.amount || 0), 0);
            const totalSales = (sales_cash || 0) + (sales_card || 0) + (sales_transfer || 0);

            const mappedData = {
                shift,
                branch,
                user,
                closingType: 'SIIGO',
                summary: {
                    totalSales,
                    cashSales: sales_cash,
                    cardSales: sales_card,
                    transferSales: sales_transfer,
                    totalExpenses,
                    salesCount: products?.length || 0
                },
                cashCount: finalCash,
                cashCounts,
                difference,
                cashToDeliver: finalCash,
                productsSold: products
            };

            await PrinterService.getInstance().printClosing(mappedData);
            return { success: true, message: 'Print Job Sent' };

        } catch (error) {
            console.error('[Printer] Error generating Siigo closing:', error);
            // dialog.showErrorBox('Error de Impresión', String(error));
            return { success: false, error: 'Failed to print' };
        }
    });

    // Print Order Details IPC (Standalone)
    ipcMain.handle('print-order-details', async (e, { items }) => {
        console.log('[Printer] Generating Order Details via ESC/POS...');
        if (!items || items.length === 0) return { success: false, error: 'No items' };

        try {
            await PrinterService.getInstance().printOrderDetails({ items });
            return { success: true, message: 'Print Job Sent' };
        } catch (error) {
            console.error('[Printer] Order details print failed:', error);
            return { success: false, error: String(error) };
        }
    });


    // DEPRECATED: db-get-products replaced by db:get-products (Drizzle)
    // DEPRECATED: db-sync-products handled by PowerSync
    // ipcMain.handle('db-get-products', () => ProductDAO.getAll());
    // ipcMain.handle('db-sync-products', (e, products) => ProductDAO.upsertMany(products));

    ipcMain.handle('db-get-users', () => userController.getAll());
    ipcMain.handle('db-sync-users', (e, users) => userController.upsertMany(users));

    // Controllers (Initialized in async block above)

    // Sales IPC (Drizzle Controller)
    ipcMain.handle('db-save-sale', (e, sale, items) => salesController.saveSale(sale, items));
    ipcMain.handle('db:get-products', (e, params) => inventoryController.getProducts(params));
    ipcMain.handle('db:get-categories', () => inventoryController.getCategories());
    ipcMain.handle('db-get-sales-by-shift', (e, shiftId) => salesController.getByShift(shiftId));

    // Legacy Helpers (Not yet migrated to Controller entirely)
    // Analytics & Legacy Helpers
    ipcMain.handle('db-get-all-sales', () => salesController.getAll());
    ipcMain.handle('db-mark-synced', (e, saleId) => salesController.markSynced(saleId));
    ipcMain.handle('db-get-product-trends', (e, days) => salesController.getProductTrends(days));
    ipcMain.handle('db-get-product-trends-by-range', (e, { start, end }) => salesController.getProductTrendsByRange(start, end));
    ipcMain.handle('db-get-product-daily-trends', (e, days) => salesController.getProductDailyTrends(days));
    ipcMain.handle('db-update-sale-shift', (e, { saleId, shiftId }) => salesController.updateShift(saleId, shiftId));
    ipcMain.handle('db-import-sales-batch', (e, sales) => salesController.importBatch(sales));
    ipcMain.handle('db-prune-data', (e, days) => systemController.pruneOldData(days));

    // Client/Loyalty IPC
    // Client/Loyalty IPC
    ipcMain.handle('db-search-clients', (e, query) => clientController.search(query));
    ipcMain.handle('db-create-client', (e, client) => clientController.create(client));
    ipcMain.handle('db-sync-clients', (e, clients) => clientController.upsertMany(clients));
    ipcMain.handle('db-get-pending-clients', () => clientController.getPending());
    ipcMain.handle('db-mark-client-synced', (e, id) => clientController.markSynced(id));

    // Branch IPC
    ipcMain.handle('db-get-branches', () => branchController.getAll());
    ipcMain.handle('db-sync-branches', (e, branches) => branchController.upsertMany(branches));

    // Shift IPC (Drizzle Controller)
    ipcMain.handle('db-open-shift', (e, shift) => shiftController.openShift(shift));
    ipcMain.handle('db-close-shift', (e, data) => shiftController.closeShift(data));
    ipcMain.handle('db-get-shift', () => shiftController.getShift());
    ipcMain.handle('db-get-shift-summary', (e, shiftId) => shiftController.getSummary(shiftId));

    // Shift Legacy Helpers
    // Shift Legacy Helpers
    ipcMain.handle('db-get-pending-shifts', () => shiftController.getPendingShifts());
    ipcMain.handle('db-mark-shift-synced', (e, id) => shiftController.markSynced(id));
    ipcMain.handle('db-get-all-shifts', (e, limit) => shiftController.getAllShifts(limit));
    ipcMain.handle('db-update-shift', (e, { id, data }) => shiftController.updateShiftData(id, data));

    // Expense IPC (Drizzle Controller Delegate)
    ipcMain.handle('db-create-expense', (e, expense) => shiftController.createExpense(expense)); // Moved to ShiftController
    ipcMain.handle('db-get-expenses-by-shift', (e, shiftId) => {
        const db = getDb();
        return db.select().from(expenses).where(eq(expenses.shift_id, shiftId)).orderBy(desc(expenses.created_at));
    });
    ipcMain.handle('db-get-all-expenses', () => shiftController.getAllExpenses());
    ipcMain.handle('db-delete-expense', (e, id) => shiftController.deleteExpense(id));
    ipcMain.handle('db-sync-expenses', (e, items) => shiftController.upsertExpenses(items));
    ipcMain.handle('db-get-pending-expenses', () => shiftController.getPendingExpenses());
    ipcMain.handle('db-mark-expense-synced', (e, id) => shiftController.markExpenseSynced(id));


    // Tip Distribution IPC (Drizzle Controller Delegate)
    ipcMain.handle('db-create-tip-distribution', (e, item) => shiftController.createTipDistribution(item));
    ipcMain.handle('db-create-tip-distributions', (e, items) => shiftController.createTipDistributions(items));
    ipcMain.handle('db-get-tip-distributions-by-shift', (e, shiftId) => {
        const db = getDb();
        return db.select().from(tipDistributions).where(eq(tipDistributions.shift_id, shiftId));
    });
    ipcMain.handle('db-get-tip-distributions-by-employee', (e, employeeId) => shiftController.getTipDistributionsByEmployee(employeeId));
    ipcMain.handle('db-get-employee-tips-total', (e, employeeId) => shiftController.getEmployeeTipsTotal(employeeId));
    ipcMain.handle('db-get-pending-tip-distributions', () => shiftController.getPendingTipDistributions());
    ipcMain.handle('db-mark-tip-distribution-synced', (e, id) => shiftController.markTipDistributionSynced(id));
    ipcMain.handle('db-sync-tip-distributions', (e, distributions) => shiftController.upsertTipDistributions(distributions));

    // Table IPC
    // Table IPC
    ipcMain.handle('db-get-tables', (e, branchId) => tableController.getByBranch(branchId));
    ipcMain.handle('db-create-table', (e, table) => tableController.create(table));
    ipcMain.handle('db-update-table', (e, { id, data }) => tableController.update(id, data));
    ipcMain.handle('db-delete-table', (e, id) => tableController.delete(id));

    // Order IPC
    // Order IPC (Drizzle Migration)
    ipcMain.handle('db-create-order', (e, { order, items }) => salesController.createOrder(order, items));
    ipcMain.handle('db-add-order-item', (e, item) => salesController.addItemToOrder(item));
    ipcMain.handle('db-update-order-item', (e, { itemId, quantity, totalPrice }) => salesController.updateOrderItem(itemId, quantity, totalPrice));
    ipcMain.handle('db-delete-order-item', (e, itemId) => salesController.deleteItemFromOrder(itemId));
    ipcMain.handle('db-complete-order', (e, orderId) => salesController.completeOrder(orderId));

    ipcMain.handle('db-get-pending-order', (e, tableId) => salesController.getPendingOrder(tableId));
    ipcMain.handle('db-update-order-diners', (e, { orderId, diners }) => salesController.updateOrderDiners(orderId, diners));
    ipcMain.handle('db-update-order-table', (e, { orderId, tableId }) => salesController.updateOrderTable(orderId, tableId));

    // NOTE: This IPC was named 'db-order-get-items' in legacy, migrating to consistent naming if possible, but keeping for compatibility
    ipcMain.handle('db-order-get-items', (e, orderId) => salesController.getOrderItems(orderId));
    ipcMain.handle('db-delete-order', (e, orderId) => salesController.deleteOrder(orderId));
    ipcMain.handle('db-get-all-orders', () => salesController.getAllOrders());
    ipcMain.handle('db-get-sale-items', (e, saleId) => salesController.getSaleItems(saleId)); // Correction: db-get-sale-items needs to fetch SALE items, not ORDER items.

    // Rappi IPC
    // Rappi IPC
    ipcMain.handle('db-create-rappi-delivery', (e, delivery) => deliveryController.createRappi(delivery));
    ipcMain.handle('db-get-rappi-deliveries', () => deliveryController.getRappiAll());
    ipcMain.handle('db-get-pending-rappi', () => deliveryController.getRappiPending());
    ipcMain.handle('db-mark-rappi-synced', (e, id) => deliveryController.markRappiSynced(id));
    ipcMain.handle('db-update-rappi-status', (e, { id, status }) => deliveryController.updateRappiStatus(id, status));

    // Standard Delivery IPC
    ipcMain.handle('db-create-delivery', (e, delivery) => deliveryController.create(delivery));
    ipcMain.handle('db-get-deliveries', () => deliveryController.getAll());
    ipcMain.handle('db-get-deliveries-by-branch', (e, branchId) => deliveryController.getByBranch(branchId));
    ipcMain.handle('db-get-pending-deliveries', () => deliveryController.getPending());
    ipcMain.handle('db-mark-delivery-synced', (e, id) => deliveryController.markSynced(id));
    ipcMain.handle('db-update-delivery-status', (e, { id, status }) => deliveryController.updateStatus(id, status));
    ipcMain.handle('db-sync-deliveries', (e, items) => deliveryController.upsertMany(items));

    // DEV ONLY: Reset and generate mock data
    ipcMain.handle('dev-reset-and-generate-mock-data', async () => {
        // Open a temporary connection strictly for this maintenance task
        const dbPath = path.join(app.getPath('userData'), 'pos.db');
        const tempDb = new Database(dbPath);
        try {
            const { resetAndGenerateMockData } = require('./dev-reset-data');
            return resetAndGenerateMockData(tempDb);
        } finally {
            tempDb.close();
        }
    });

    ipcMain.handle('dev-generate-employees', async () => {
        const dbPath = path.join(app.getPath('userData'), 'pos.db');
        const tempDb = new Database(dbPath);
        try {
            const { generateMockEmployees } = require('./dev-reset-data');
            return generateMockEmployees(tempDb);
        } finally {
            tempDb.close();
        }
    });

    ipcMain.handle('print-combined-closing', async (e, data: any) => {
        console.log('[Printer] Generating Combined Closing via ESC/POS...');
        try {
            await PrinterService.getInstance().printCombinedClosing(data);
            return { success: true, message: 'Print Job Sent' };
        } catch (error: any) {
            console.error('[Printer] Error combined closing:', error);
            return { success: false, error: error.message };
        }
    });
};