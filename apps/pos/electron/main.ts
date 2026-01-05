import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { z } from 'zod'; // Security Validation
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
import { connector } from './db/index';

// Initialize Sync Service

ipcMain.handle('auth-set-token', (event, token: string) => {
    console.log('[Main] Auth Token Received for PowerSync Connector');
    connector.setToken(token);
    // Optionally set Branch ID if available in token or separate call
    // connector.setBranchId(...); 
    return true;
});

// IPC handler to update printer organization config dynamically
const OrganizationConfigSchema = z.object({
    name: z.string().min(1, 'Organization name is required'),
    nit: z.string().min(1, 'NIT is required'),
    website: z.string().url('Invalid website URL format').or(z.literal('')).optional()
});

ipcMain.handle('printer-set-organization', (event, config) => {
    console.log('[Printer] Updating organization config...');
    try {
        const validated = OrganizationConfigSchema.parse(config);
        PrinterService.getInstance().setOrganizationConfig(validated);
        return { success: true };
    } catch (error) {
        console.error('[Printer] Invalid organization config:', error);
        return {
            success: false,
            error: error instanceof z.ZodError ? 'Validation Failed' : String(error),
            details: error instanceof z.ZodError ? error.errors : undefined
        };
    }
});

// Initialize DB
import { initDatabase, getDb } from './db/index';
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
            const allProducts = await db.select().from(products);
            console.log(`[IPC] db:get-products (Full) -> Returning ${allProducts.length} items`);
            return allProducts;
        }
        return handlePaginated('db:get-products', products, params, products.name, products.category_id);
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

    // Initialize PrinterService with organization branding
    // TODO: Load from organization settings when tenant system is fully implemented
    // For now, use default PanPanocha branding with override capability via IPC
    try {
        PrinterService.getInstance().setOrganizationConfig({
            name: 'PAN PANOCHA',
            nit: '900.123.456-7',
            website: 'https://www.panpanocha.com'
        });
        console.log('[Printer] Organization config initialized with default branding.');
    } catch (e) {
        console.error('[Printer] Failed to initialize organization config:', e);
    }

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
            try {
                if (!payload.branch && payload.sale.branch_id) {
                    payload.branch = await branchController.get(String(payload.sale.branch_id));
                }
                if (!payload.user && payload.sale.created_by) {
                    payload.user = await userController.get(String(payload.sale.created_by));
                }
            } catch (enrichError) {
                console.warn('[Main] Data enrichment failed (proceeding with available data):', enrichError);
                // Continue with available data - branch and user are optional
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
    // === CLOSING SCHEMAS ===

    const ClosingDataSchema = z.object({
        shift: z.object({
            id: z.string(),
            initial_cash: z.number().nonnegative(),
            turn_type: z.string().optional()
        }).passthrough(),
        branch: z.any().optional(),
        user: z.any().optional(),
        summary: z.object({
            totalSales: z.number().nonnegative(),
            cashSales: z.number().nonnegative(),
            cardSales: z.number().nonnegative(),
            transferSales: z.number().nonnegative(),
            totalExpenses: z.number().nonnegative(),
            salesCount: z.number().int().nonnegative()
        }).passthrough(),
        cashCount: z.number().nonnegative(),
        cashCounts: z.record(z.number()).optional(),
        difference: z.number(),
        cashToDeliver: z.number().nonnegative(),
        closingType: z.string().optional(),
        productsSold: z.array(z.any()).optional()
    });

    const SiigoClosingSchema = z.object({
        shift: z.any(),
        branch: z.any().optional(),
        user: z.any().optional(),
        sales_cash: z.number().nonnegative().default(0),
        sales_card: z.number().nonnegative().default(0),
        sales_transfer: z.number().nonnegative().default(0),
        expenses: z.array(z.object({ amount: z.number() })).default([]),
        finalCash: z.number().nonnegative(),
        difference: z.number(),
        products: z.array(z.any()).optional(),
        cashCounts: z.record(z.number()).optional()
    });

    const CombinedClosingSchema = z.object({
        shift: z.object({
            name: z.string().optional()
        }).passthrough(),
        user: z.object({
            full_name: z.string().optional()
        }).passthrough().optional(),
        summary: z.object({
            totalBase: z.number().default(0),
            totalCashSales: z.number().default(0),
            totalExpenses: z.number().default(0),
            tipsDelivered: z.number().default(0),
            // Critical fields: required to catch upstream data issues
            expectedCash: z.number({ required_error: 'expectedCash is required' }),
            realCash: z.number({ required_error: 'realCash is required' }),
            difference: z.number({ required_error: 'difference is required' }),
            cashToDeliver: z.number({ required_error: 'cashToDeliver is required' }),
            totalCard: z.number().default(0),
            totalTransfer: z.number().default(0)
        }).passthrough()
    });

    // Print Closing Receipt IPC
    ipcMain.handle('print-closing', async (e, closingData) => {
        console.log('[Printer] Generating Closing Receipt via ESC/POS...');
        try {
            const validated = ClosingDataSchema.parse(closingData);
            await PrinterService.getInstance().printClosing(validated);
            return { success: true, message: 'Print Job Sent' };
        } catch (error) {
            console.error('[Printer] Closing print failed:', error);
            // dialog.showErrorBox('Error de Impresión', String(error));
            return {
                success: false,
                error: error instanceof z.ZodError ? 'Validation Failed' : String(error),
                details: error instanceof z.ZodError ? error.errors : undefined
            };
        }
    });

    // Print Siigo Closing Receipt IPC
    ipcMain.handle('print-siigo-closing', async (e, closingData) => {
        console.log('[Printer] Generating Siigo Closing via ESC/POS...');



        try {
            const validated = SiigoClosingSchema.parse(closingData);
            const {
                shift, branch, user,
                sales_cash, sales_card, sales_transfer,
                expenses, finalCash, difference, products, cashCounts
            } = validated;

            // Defensive: ensure expenses is an array before reduce
            const expensesArray = Array.isArray(expenses) ? expenses : [];
            const totalExpenses = expensesArray.reduce((acc, curr) => {
                const amount = typeof curr?.amount === 'number' ? curr.amount : 0;
                return acc + amount;
            }, 0);

            // Defensive: coerce sales values to numbers with defaults
            const safeSalesCash = Number(sales_cash) || 0;
            const safeSalesCard = Number(sales_card) || 0;
            const safeSalesTransfer = Number(sales_transfer) || 0;
            const safeFinalCash = Number(finalCash) || 0;
            const safeDifference = Number(difference) || 0;

            const totalSales = safeSalesCash + safeSalesCard + safeSalesTransfer;

            // Defensive: ensure products is an array before accessing length
            const productsArray = Array.isArray(products) ? products : [];

            // Defensive: validate cashCounts shape
            const safeCashCounts = (cashCounts && typeof cashCounts === 'object' && !Array.isArray(cashCounts))
                ? cashCounts
                : undefined;

            const mappedData = {
                shift,
                branch,
                user,
                closingType: 'SIIGO',
                summary: {
                    totalSales,
                    cashSales: safeSalesCash,
                    cardSales: safeSalesCard,
                    transferSales: safeSalesTransfer,
                    totalExpenses,
                    salesCount: productsArray.length
                },
                cashCount: safeFinalCash,
                cashCounts: safeCashCounts,
                difference: safeDifference,
                cashToDeliver: safeFinalCash,
                productsSold: productsArray
            };

            await PrinterService.getInstance().printClosing(mappedData);
            return { success: true, message: 'Print Job Sent' };

        } catch (error) {
            console.error('[Printer] Error generating Siigo closing:', error);
            return {
                success: false,
                error: error instanceof z.ZodError ? 'Validation Failed' : String(error),
                details: error instanceof z.ZodError ? error.errors : undefined
            };
        }
    });

    // Print Order Details Schema & IPC
    const OrderDetailsSchema = z.object({
        items: z.array(z.object({
            name: z.string().trim().min(1, "Item name is required"),
            quantity: z.number().positive(),
            price: z.number().nonnegative()
        })).min(1, "At least one item required"),
        user: z.object({
            full_name: z.string().optional()
        }).optional()
    });

    ipcMain.handle('print-order-details', async (e, data) => {
        console.log('[Printer] Generating Order Details via ESC/POS...');
        try {
            const validated = OrderDetailsSchema.parse(data);
            await PrinterService.getInstance().printOrderDetails(validated);
            return { success: true, message: 'Print Job Sent' };
        } catch (error) {
            console.error('[Printer] Order details print failed:', error);
            return {
                success: false,
                error: error instanceof z.ZodError ? 'Validation Failed' : String(error),
                details: error instanceof z.ZodError ? error.errors : undefined
            };
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
    // db:get-products is already handled in setupIPC with correct logic for both full/paginated
    // ipcMain.handle('db:get-products', (e, params) => inventoryController.getProducts(params));
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



    ipcMain.handle('print-combined-closing', async (e, data) => {
        console.log('[Printer] Generating Combined Closing via ESC/POS...');

        // Defensive validation: check data is an object
        if (!data || typeof data !== 'object') {
            return { success: false, error: 'Invalid combined closing data: expected an object' };
        }

        // Validate required summary field exists
        if (!data.summary || typeof data.summary !== 'object') {
            return { success: false, error: 'Invalid combined closing data: summary is required' };
        }

        try {
            const validated = CombinedClosingSchema.parse(data);
            await PrinterService.getInstance().printCombinedClosing(validated);
            return { success: true, message: 'Print Job Sent' };
        } catch (error) {
            console.error('[Printer] Error combined closing:', error);
            return {
                success: false,
                error: error instanceof z.ZodError ? 'Validation Failed' : String(error),
                details: error instanceof z.ZodError ? error.errors : undefined
            };
        }
    });
};
