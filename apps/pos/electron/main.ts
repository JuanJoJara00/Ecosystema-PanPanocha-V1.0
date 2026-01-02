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
    ipcMain.handle('print-closing', async (e, closingData) => {
        console.log('[Printer] Generating PDF closing receipt...');

        try {
            const PDFDocument = require('pdfkit');
            const {
                shift,
                branch,
                user,
                summary,
                cashCount,
                cashCounts, // Denomination breakdown: { [denom]: count }
                difference,
                cashToDeliver,
                closingType,
                productsSold
            } = closingData;

            console.log('[Printer] Received closing data:', {
                hasCashCounts: !!cashCounts,
                cashCountsKeys: cashCounts ? Object.keys(cashCounts) : [],
                productsSoldLength: productsSold?.length,
                productsSoldData: productsSold // Log actual data to verify
            });

            // Define directory to save receipts
            const documentsPath = app.getPath('documents');
            const closingsDir = path.join(documentsPath, 'PanPanocha_Cierres');
            if (!fs.existsSync(closingsDir)) {
                fs.mkdirSync(closingsDir, { recursive: true });
            }

            const dateNow = new Date();
            const dateStr = dateNow.toLocaleDateString('es-CO');
            const timeStr = dateNow.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
            const filename = `Cierre_${closingType}_${dateNow.toISOString().slice(0, 10)}_${dateNow.getTime()}.pdf`;
            const filePath = path.join(closingsDir, filename);

            // Create PDF document - 80mm thermal paper
            const doc = new PDFDocument({
                size: [226.77, 841.89],
                margins: { top: 10, bottom: 10, left: 10, right: 10 }
            });

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            // === LOGO ===
            const logoPath = path.join(__dirname, '..', 'public', 'images', 'logo_v2.png');
            const alternateLogo = path.join(process.cwd(), 'public', 'images', 'logo_v2.png');

            if (fs.existsSync(logoPath)) {
                try {
                    doc.image(logoPath, 88, 15, { width: 50, height: 50 });
                    doc.y = 75;
                } catch (err) { console.log('[Printer] Logo error:', err); }
            } else if (fs.existsSync(alternateLogo)) {
                try {
                    doc.image(alternateLogo, 88, 15, { width: 50, height: 50 });
                    doc.y = 75;
                } catch (err) { console.log('[Printer] Logo error:', err); }
            }

            // === HEADER ===
            doc.font('Courier-Bold');
            doc.fontSize(11).text('PANPANOCHA', { align: 'center' });
            doc.fontSize(9).text('CIERRE DE CAJA', { align: 'center' });
            doc.fontSize(8).font('Courier').text(`Tipo: ${closingType.toUpperCase()}`, { align: 'center' });

            doc.moveDown(0.3);
            doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
            doc.moveDown(0.3);

            // === SHIFT INFO ===
            doc.fontSize(8).font('Courier');
            doc.text(`Sede: ${branch?.name || 'Principal'}`);
            doc.text(`Cajero: ${user?.full_name || 'Staff'}`);
            doc.text(`Fecha: ${dateStr}`);
            doc.text(`Hora: ${timeStr}`);
            doc.text(`Turno: ${shift?.turn_type || 'Único'}`);

            doc.moveDown(0.5);
            doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
            doc.moveDown(0.2);
            doc.fontSize(9).font('Courier-Bold').text('RESUMEN DE VENTAS', { align: 'center' });
            doc.moveDown(0.2);
            doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
            doc.moveDown(0.3);

            // === SALES SUMMARY ===
            doc.fontSize(8).font('Courier');

            const totalSales = summary?.totalSales || 0;
            const cashSales = summary?.cashSales || 0;
            const cardSales = summary?.cardSales || 0;
            const transferSales = summary?.transferSales || 0;
            const totalExpenses = summary?.totalExpenses || 0;
            const salesCount = summary?.salesCount || 0;

            doc.text(`Ventas (#${salesCount}):`, { continued: true });
            doc.text(`$${totalSales.toLocaleString('es-CO')}`, { align: 'right' });

            doc.moveDown(0.3);
            doc.text(`  Efectivo:`, { continued: true });
            doc.text(`$${cashSales.toLocaleString('es-CO')}`, { align: 'right' });

            doc.text(`  Tarjeta:`, { continued: true });
            doc.text(`$${cardSales.toLocaleString('es-CO')}`, { align: 'right' });

            doc.text(`  Transferencia:`, { continued: true });
            doc.text(`$${transferSales.toLocaleString('es-CO')}`, { align: 'right' });

            doc.moveDown(0.3);
            doc.text(`Gastos de Caja:`, { continued: true });
            doc.text(`-$${totalExpenses.toLocaleString('es-CO')}`, { align: 'right' });

            doc.moveDown(0.5);
            doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
            doc.moveDown(0.2);
            doc.fontSize(9).font('Courier-Bold').text('ARQUEO DE CAJA', { align: 'center' });
            doc.moveDown(0.2);
            doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
            doc.moveDown(0.3);

            // === INVENTARIO DE EFECTIVO (Denomination Breakdown) ===
            if (cashCounts) {
                // Always print section if cashCounts exists, even if 0 to show it was checked
                doc.fontSize(8).font('Courier-Bold').text('Inventario de efectivo', { align: 'left' });
                doc.moveDown(0.2);

                // Helper to safely get count regardless of key type (string/number)
                const getCount = (denom: number) => {
                    return (cashCounts[denom] || cashCounts[String(denom)] || 0);
                };

                // MONEDAS
                const coins = [1000, 500, 200, 100, 50];
                doc.font('Courier-Bold').text('MONEDAS', { align: 'left' });
                doc.font('Courier');
                coins.forEach(denom => {
                    const count = getCount(denom);
                    if (count > 0) {
                        const total = denom * count;
                        doc.text(`  ${denom.toLocaleString('es-CO')} X ${count} = $${total.toLocaleString('es-CO')}`, { align: 'right' });
                    }
                });

                doc.moveDown(0.2);

                // BILLETES
                const bills = [2000, 5000, 10000, 20000, 50000, 100000];
                doc.font('Courier-Bold').text('BILLETES', { align: 'left' });
                doc.font('Courier');
                bills.forEach(denom => {
                    const count = getCount(denom);
                    if (count > 0) {
                        const total = denom * count;
                        doc.text(`  ${denom.toLocaleString('es-CO')} X ${count} = $${total.toLocaleString('es-CO')}`, { align: 'right' });
                    }
                });

                doc.moveDown(0.3);
                doc.font('Courier-Bold');
                doc.text(`Efectivo contado:`, { continued: true });
                doc.text(`$${(cashCount || 0).toLocaleString('es-CO')}`, { align: 'right' });
                doc.moveDown(0.3);
                doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
                doc.moveDown(0.3);
            } else {
                console.log('[Printer] No cashCounts data provided or it is empty.');
            }

            // === CASH COUNT SUMMARY ===
            doc.fontSize(8).font('Courier');
            const expectedCash = (shift?.initial_cash || 0) + cashSales - totalExpenses;

            doc.text(`Base Inicial:`, { continued: true });
            doc.text(`$${(shift?.initial_cash || 0).toLocaleString('es-CO')}`, { align: 'right' });

            doc.text(`+ Ventas Efectivo:`, { continued: true });
            doc.text(`$${cashSales.toLocaleString('es-CO')}`, { align: 'right' });

            doc.text(`- Gastos:`, { continued: true });
            doc.text(`$${totalExpenses.toLocaleString('es-CO')}`, { align: 'right' });

            doc.moveDown(0.3);
            doc.font('Courier-Bold');
            doc.text(`ESPERADO:`, { continued: true });
            doc.text(`$${expectedCash.toLocaleString('es-CO')}`, { align: 'right' });

            doc.text(`CONTADO:`, { continued: true });
            const finalCashCount = cashCount || 0;
            doc.text(`$${finalCashCount.toLocaleString('es-CO')}`, { align: 'right' });

            doc.moveDown(0.3);
            const diffLabel = difference > 0 ? 'SOBRANTE' : difference < 0 ? 'FALTANTE' : 'CUADRE PERFECTO';
            doc.fontSize(9);
            doc.text(`${diffLabel}:`, { continued: true });
            doc.text(`$${Math.abs(difference || 0).toLocaleString('es-CO')}`, { align: 'right' });

            doc.moveDown(0.5);
            doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
            doc.moveDown(0.3);

            // === CASH TO DELIVER ===
            doc.fontSize(10).font('Courier-Bold');
            doc.text('A ENTREGAR:', { continued: true });
            doc.text(`$${(cashToDeliver || 0).toLocaleString('es-CO')}`, { align: 'right' });

            doc.moveDown(0.3);
            doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
            doc.moveDown(0.5);



            // === SIGNATURE LINE ===
            doc.moveDown(1);
            doc.fontSize(8).font('Courier');
            doc.text('_________________________', { align: 'center' });
            doc.text('Firma Cajero', { align: 'center' });

            doc.moveDown(1);
            doc.text('_________________________', { align: 'center' });
            doc.text('Firma Encargado', { align: 'center' });

            doc.moveDown(0.5);
            doc.fontSize(7);
            doc.text('www.panpanocha.com', { align: 'center' });

            // Finalize Main PDF
            doc.end();

            await new Promise<void>((resolve, reject) => {
                stream.on('finish', () => {
                    console.log('[Printer] Main closing PDF stream finished writing.');
                    resolve();
                });
                stream.on('error', (err) => {
                    console.error('[Printer] Error writing main closing PDF stream:', err);
                    reject(err);
                });
            });

            console.log('[Printer] Closing PDF saved to:', filePath);
            console.log('[Printer] Opening main closing PDF...');
            shell.openPath(filePath);

            // === SEPARATE PRODUCTS RECEIPT ===
            if (productsSold && productsSold.length > 0) {
                try {
                    console.log('[Printer] Generating separate products receipt...');
                    const productsFilename = `Cierre_Productos_${closingType}_${dateNow.toISOString().slice(0, 10)}_${dateNow.getTime()}.pdf`;
                    const productsFilePath = path.join(closingsDir, productsFilename);

                    const docProd = new PDFDocument({
                        size: [226.77, 841.89], // 80mm width
                        margins: { top: 10, bottom: 10, left: 10, right: 10 }
                    });

                    const streamProd = fs.createWriteStream(productsFilePath);
                    docProd.pipe(streamProd);
                    console.log(`[Printer] Products PDF stream created for: ${productsFilePath}`);

                    // -- Logo --
                    if (fs.existsSync(logoPath)) {
                        try {
                            docProd.image(logoPath, 88, 15, { width: 50, height: 50 });
                            docProd.y = 75;
                            console.log('[Printer] Products PDF: Logo from __dirname loaded.');
                        } catch (err) { console.log('[Printer] Products PDF: Logo error from __dirname:', err); }
                    } else if (fs.existsSync(alternateLogo)) {
                        try {
                            docProd.image(alternateLogo, 88, 15, { width: 50, height: 50 });
                            docProd.y = 75;
                            console.log('[Printer] Products PDF: Logo from process.cwd loaded.');
                        } catch (err) { console.log('[Printer] Products PDF: Logo error from process.cwd:', err); }
                    } else {
                        console.log('[Printer] Products PDF: No logo found at either path.');
                    }

                    // -- Header --
                    docProd.font('Courier-Bold');
                    docProd.fontSize(10).text('PANPANOCHA', { align: 'center' });
                    docProd.fontSize(9).text('REPORTE DE PRODUCTOS', { align: 'center' });
                    docProd.fontSize(8).font('Courier').text(`Fecha: ${dateStr} - ${timeStr}`, { align: 'center' });
                    docProd.text(`Cajero: ${user?.full_name || 'Staff'}`);

                    docProd.moveDown(0.3);
                    docProd.moveTo(10, docProd.y).lineTo(216.77, docProd.y).stroke();
                    docProd.moveDown(0.3);

                    // -- Products List --
                    docProd.fontSize(8).font('Courier');

                    productsSold.forEach((p: { name: string; quantity: number; total: number }) => {
                        const pName = (p.name || '').slice(0, 20);
                        docProd.text(`${pName}`, { continued: true });
                        docProd.text(` x${p.quantity}`, { align: 'right' });
                    });

                    // Summary
                    docProd.moveDown(0.5);
                    docProd.moveTo(10, docProd.y).lineTo(216.77, docProd.y).stroke();
                    docProd.moveDown(0.2);
                    const totalItems = productsSold.reduce((acc: number, curr: any) => acc + (curr.quantity || 0), 0);
                    docProd.fontSize(9).font('Courier-Bold');
                    docProd.text(`Total Items: ${totalItems}`, { align: 'center' });

                    docProd.moveDown(1);
                    docProd.fontSize(7).font('Courier');
                    docProd.text('www.panpanocha.com', { align: 'center' });

                    docProd.end();

                    await new Promise<void>((resolve, reject) => {
                        streamProd.on('finish', () => {
                            console.log('[Printer] Products PDF stream finished writing.');
                            resolve();
                        });
                        streamProd.on('error', (err) => {
                            console.error('[Printer] Error writing products PDF stream:', err);
                            reject(err);
                        });
                    });

                    console.log('[Printer] Products PDF saved to:', productsFilePath);

                    // Open separate PDF
                    console.log('[Printer] Opening products PDF with a delay...');
                    setTimeout(() => {
                        shell.openPath(productsFilePath);
                    }, 1000); // Small delay to ensure OS handles first open

                } catch (prodErr) {
                    console.error('[Printer] Error generating products PDF:', prodErr);
                }
            } else {
                console.log('[Printer] No productsSold data provided or it is empty, skipping products PDF generation.');
            }

            return { success: true, message: 'PDF Generated', filePath };

        } catch (error) {
            console.error('[Printer] Error generating closing PDF:', error);
            dialog.showErrorBox('Error de Impresión', `No se pudo generar el PDF de cierre.\nError: ${error instanceof Error ? error.message : String(error)}`);
            return { success: false, error: 'Failed to generate PDF' };
        }
    });

    // Print Siigo Closing Receipt IPC
    ipcMain.handle('print-siigo-closing', async (e, closingData) => {
        console.log('[Printer] Generating Siigo Closing PDF (Standard Layout)...');

        try {
            const PDFDocument = require('pdfkit');
            const {
                shift,
                branch,
                user,
                // Siigo specific data mapping
                base_cash,
                sales_cash,
                sales_card,
                sales_transfer,
                tips,
                difference,
                finalCash,    // This corresponds to 'cashCount' (actual counted cash)
                products,     // corresponds to productsSold
                expenses,     // corresponds to expensesList
                cashCounts,
                expectedCash  // available in dataToPrint
            } = closingData;

            // Construct synthetic summary for reuse
            const totalSales = (sales_cash || 0) + (sales_card || 0) + (sales_transfer || 0);
            const totalExpenses = (expenses || []).reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
            const productsSold = products;

            // Define directory to save receipts
            const documentsPath = app.getPath('documents');
            const closingsDir = path.join(documentsPath, 'PanPanocha_Cierres_Siigo');
            if (!fs.existsSync(closingsDir)) {
                fs.mkdirSync(closingsDir, { recursive: true });
            }

            const dateNow = new Date();
            const dateStr = dateNow.toLocaleDateString('es-CO');
            const timeStr = dateNow.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
            const filename = `Cierre_Siigo_${dateNow.toISOString().slice(0, 10)}_${dateNow.getTime()}.pdf`;
            const filePath = path.join(closingsDir, filename);

            // Create PDF document - 80mm thermal paper
            const doc = new PDFDocument({
                size: [226.77, 841.89],
                margins: { top: 10, bottom: 10, left: 10, right: 10 }
            });

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            // === LOGO ===
            const logoPath = path.join(__dirname, '..', 'public', 'images', 'logo_v2.png');
            const alternateLogo = path.join(process.cwd(), 'public', 'images', 'logo_v2.png');

            if (fs.existsSync(logoPath)) {
                try {
                    doc.image(logoPath, 88, 15, { width: 50, height: 50 });
                    doc.y = 75;
                } catch (err) { }
            } else if (fs.existsSync(alternateLogo)) {
                try {
                    doc.image(alternateLogo, 88, 15, { width: 50, height: 50 });
                    doc.y = 75;
                } catch (err) { }
            }

            // === HEADER ===
            doc.font('Courier-Bold');
            doc.fontSize(11).text('PANPANOCHA', { align: 'center' });
            doc.fontSize(9).text('CIERRE: SIIGO', { align: 'center' });

            doc.moveDown(0.3);
            doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
            doc.moveDown(0.3);

            // === SHIFT INFO ===
            doc.fontSize(8).font('Courier');
            doc.text(`Sede: ${branch?.name || 'Principal'}`);
            doc.text(`Cajero: ${user?.full_name || 'Staff'}`);
            doc.text(`Fecha: ${dateStr}`);
            doc.text(`Hora: ${timeStr}`);
            doc.text(`Turno: ${shift?.turn_type || 'Único'}`);

            doc.moveDown(0.5);
            doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
            doc.moveDown(0.2);
            doc.fontSize(9).font('Courier-Bold').text('RESUMEN DE VENTAS', { align: 'center' });
            doc.moveDown(0.2);
            doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
            doc.moveDown(0.3);

            // === SALES SUMMARY ===
            doc.fontSize(8).font('Courier');

            const salesCount = productsSold?.length || 0;

            doc.text(`Ventas (#${salesCount}):`, { continued: true });
            doc.text(`$${totalSales.toLocaleString('es-CO')}`, { align: 'right' });

            doc.moveDown(0.3);
            doc.text(`  Efectivo:`, { continued: true });
            doc.text(`$${(sales_cash || 0).toLocaleString('es-CO')}`, { align: 'right' });

            doc.text(`  Tarjeta:`, { continued: true });
            doc.text(`$${(sales_card || 0).toLocaleString('es-CO')}`, { align: 'right' });

            doc.text(`  Transferencia:`, { continued: true });
            doc.text(`$${(sales_transfer || 0).toLocaleString('es-CO')}`, { align: 'right' });

            doc.moveDown(0.3);
            doc.text(`Gastos de Caja:`, { continued: true });
            doc.text(`-$${totalExpenses.toLocaleString('es-CO')}`, { align: 'right' });

            doc.moveDown(0.5);
            doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
            doc.moveDown(0.2);
            doc.fontSize(9).font('Courier-Bold').text('ARQUEO DE CAJA', { align: 'center' });
            doc.moveDown(0.2);
            doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
            doc.moveDown(0.3);

            // === INVENTARIO DE EFECTIVO (Denomination Breakdown) ===
            if (cashCounts) {
                // Helper to safely get count
                const getCount = (denom: number) => {
                    return (cashCounts[denom] || cashCounts[String(denom)] || 0);
                };

                // MONEDAS
                const coins = [1000, 500, 200, 100, 50];
                doc.fontSize(8).font('Courier-Bold').text('MONEDAS', { align: 'left' });
                doc.font('Courier');
                coins.forEach(denom => {
                    const count = getCount(denom);
                    if (count > 0) {
                        const total = denom * count;
                        doc.text(`  ${denom.toLocaleString('es-CO')} X ${count} = $${total.toLocaleString('es-CO')}`, { align: 'right' });
                    }
                });

                doc.moveDown(0.2);

                // BILLETES
                const bills = [2000, 5000, 10000, 20000, 50000, 100000];
                doc.font('Courier-Bold').text('BILLETES', { align: 'left' });
                doc.font('Courier');
                bills.forEach(denom => {
                    const count = getCount(denom);
                    if (count > 0) {
                        const total = denom * count;
                        doc.text(`  ${denom.toLocaleString('es-CO')} X ${count} = $${total.toLocaleString('es-CO')}`, { align: 'right' });
                    }
                });

                doc.moveDown(0.3);
                doc.font('Courier-Bold');
                doc.text(`Efectivo contado:`, { continued: true });
                doc.text(`$${(finalCash || 0).toLocaleString('es-CO')}`, { align: 'right' });
                doc.moveDown(0.3);
                doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
                doc.moveDown(0.3);
            }

            // === CASH COUNT SUMMARY ===
            doc.fontSize(8).font('Courier');

            // Expected Logic: Base + CashSales - Expenses
            // Note: In Siigo modal, 'expectedCash' is passed, or calculated as 'totalCash - totalExpenses + totalTips' if tips included?
            // Standard standard logic: base + sales_cash - expenses. 
            // We will use the standard formula here to be consistent with layout text
            const calcExpected = (base_cash || 0) + (sales_cash || 0) - totalExpenses;

            doc.text(`Base Inicial:`, { continued: true });
            doc.text(`$${(base_cash || 0).toLocaleString('es-CO')}`, { align: 'right' });

            doc.text(`+ Ventas Efectivo:`, { continued: true });
            doc.text(`$${(sales_cash || 0).toLocaleString('es-CO')}`, { align: 'right' });

            doc.text(`- Gastos:`, { continued: true });
            doc.text(`$${totalExpenses.toLocaleString('es-CO')}`, { align: 'right' });

            doc.moveDown(0.3);
            doc.font('Courier-Bold');
            doc.text(`ESPERADO:`, { continued: true });
            doc.text(`$${calcExpected.toLocaleString('es-CO')}`, { align: 'right' });

            doc.text(`CONTADO:`, { continued: true });
            doc.text(`$${(finalCash || 0).toLocaleString('es-CO')}`, { align: 'right' });

            doc.moveDown(0.3);
            const diffLabel = (difference || 0) > 0 ? 'SOBRANTE' : (difference || 0) < 0 ? 'FALTANTE' : 'CUADRE PERFECTO';
            doc.fontSize(9);
            doc.text(`${diffLabel}:`, { continued: true });
            doc.text(`$${Math.abs(difference || 0).toLocaleString('es-CO')}`, { align: 'right' });

            doc.moveDown(0.5);
            doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
            doc.moveDown(0.3);

            // === CASH TO DELIVER ===
            // Effectively what they have in hand (finalCash) or expected? usually finalCash if short, or expected + Surplus if over? 
            // Standard code uses 'cashToDeliver' passed from frontend.
            // We will assume finalCash is what is delivered (Counted Money).

            doc.fontSize(10).font('Courier-Bold');
            doc.text('A ENTREGAR:', { continued: true });
            doc.text(`$${(finalCash || 0).toLocaleString('es-CO')}`, { align: 'right' });

            doc.moveDown(0.3);
            doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
            doc.moveDown(0.5);

            // === SIGNATURE LINE ===
            doc.moveDown(1);
            doc.fontSize(8).font('Courier');
            doc.text('_________________________', { align: 'center' });
            doc.text('Firma Cajero', { align: 'center' });

            doc.moveDown(1);
            doc.text('_________________________', { align: 'center' });
            doc.text('Firma Encargado', { align: 'center' });

            doc.moveDown(0.5);
            doc.fontSize(7);
            doc.text('www.panpanocha.com', { align: 'center' });

            // Finalize Main PDF
            doc.end();

            await new Promise<void>((resolve, reject) => {
                stream.on('finish', () => {
                    console.log('[Printer] Siigo closing PDF stream finished writing.');
                    resolve();
                });
                stream.on('error', (err) => {
                    console.error('[Printer] Error writing Siigo closing PDF stream:', err);
                    reject(err);
                });
            });

            console.log('[Printer] Siigo Closing PDF saved to:', filePath);

            // Open separate products PDF if products exist?
            // The frontend calls 'print-order-details' separately for products if needed.
            // So we only print the receipt here.

            console.log('[Printer] Opening Siigo closing PDF...');
            setTimeout(() => {
                shell.openPath(filePath);
            }, 500);

            return { success: true, message: 'PDF Generated', filePath };

        } catch (error) {
            console.error('[Printer] Error generating Siigo closing PDF:', error);
            dialog.showErrorBox('Error de Impresión', `No se pudo generar el PDF de cierre siigo.\nError: ${error instanceof Error ? error.message : String(error)}`);
            return { success: false, error: 'Failed to generate PDF' };
        }
    });

    // Print Order Details IPC (Standalone)
    ipcMain.handle('print-order-details', async (e, { items }) => {
        console.log('[Printer] Generating Order Details PDF...');
        if (!items || items.length === 0) return { success: false, error: 'No items' };

        try {
            const PDFDocument = require('pdfkit');
            // Define directory
            const documentsPath = app.getPath('documents');
            const dir = path.join(documentsPath, 'PanPanocha_Detalles');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            const dateNow = new Date();
            const filename = `Detalle_${dateNow.getTime()}.pdf`;
            const filePath = path.join(dir, filename);

            const doc = new PDFDocument({
                size: [226.77, 841.89],
                margins: { top: 10, bottom: 10, left: 10, right: 10 }
            });

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            // Simple Header
            doc.font('Courier-Bold');
            doc.fontSize(10).text('PANPANOCHA', { align: 'center' });
            doc.fontSize(9).text('DETALLE DE PRODUCTOS', { align: 'center' });
            doc.fontSize(7).font('Courier').text(dateNow.toLocaleString('es-CO'), { align: 'center' });

            doc.moveDown(0.5);
            doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
            doc.moveDown(0.3);

            // Items
            doc.fontSize(8).font('Courier');
            items.forEach((item: any) => {
                const name = item.name || 'Producto';
                const qty = item.quantity || 1;
                const price = item.price || 0;
                const total = qty * price;

                doc.text(`${name}`);
                doc.text(`${qty} x $${price.toLocaleString('es-CO')} = $${total.toLocaleString('es-CO')}`, { align: 'right' });
                doc.moveDown(0.1);
            });

            doc.moveDown(0.5);
            doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();

            const grandTotal = items.reduce((acc: number, i: any) => acc + (i.quantity * i.price), 0);
            doc.font('Courier-Bold').fontSize(9);
            doc.text(`TOTAL: $${grandTotal.toLocaleString('es-CO')}`, { align: 'right' });

            doc.end();

            await new Promise<void>((resolve, reject) => {
                stream.on('finish', resolve);
                stream.on('error', reject);
            });

            shell.openPath(filePath);
            return { success: true, filePath };

        } catch (error) {
            console.error('[Printer] Error details PDF:', error);
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
        console.log('[Printer] Generating Combined Closing PDF...');
        try {
            const PDFDocument = require('pdfkit');
            // Define directory
            const documentsPath = app.getPath('documents');
            const dir = path.join(documentsPath, 'PanPanocha_Cierres');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            const dateNow = new Date();
            const filename = `CierreTotal_${dateNow.getTime()}.pdf`;
            const filePath = path.join(dir, filename);

            const doc = new PDFDocument({
                size: [226.77, 841.89], // 80mm roll width approx
                margins: { top: 10, bottom: 10, left: 10, right: 10 }
            });

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            // --- HEADER ---
            // Logo placeholder (circle) if we could, but text is fine
            doc.font('Courier-Bold');
            doc.fontSize(10).text('PANPANOCHA', { align: 'center' });
            doc.fontSize(9).text('CIERRE TOTAL DE TURNO', { align: 'center' });

            doc.moveDown(0.5);
            doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
            doc.moveDown(0.2);

            // Info block
            doc.fontSize(8).font('Courier');
            doc.text(`Fecha: ${dateNow.toLocaleDateString('es-CO')}`);
            doc.text(`Hora: ${dateNow.toLocaleTimeString('es-CO')}`);
            doc.text(`Turno: ${data.shift?.name || 'General'}`);
            doc.text(`Responsable: ${data.user?.full_name || 'N/A'}`);

            doc.moveDown(0.2);
            doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
            doc.moveDown(0.2);

            // --- CASH SUMMARY ---
            doc.fontSize(9).font('Courier-Bold').text('RESUMEN CONSOLIDADO', { align: 'center' });
            doc.moveDown(0.2);

            doc.fontSize(8).font('Courier');

            // Base
            doc.text(`Base Inicial Total:`, { continued: true });
            doc.text(`$${(data.summary.totalBase || 0).toLocaleString('es-CO')}`, { align: 'right' });

            // Sales Cash
            doc.text(`+ Ventas Efectivo:`, { continued: true });
            doc.text(`$${(data.summary.totalCashSales || 0).toLocaleString('es-CO')}`, { align: 'right' });

            // Expenses (Operational)
            doc.text(`- Gastos Operativos:`, { continued: true });
            doc.text(`$${(data.summary.totalExpenses || 0).toLocaleString('es-CO')}`, { align: 'right' });

            // Tips Delivered (Explicit subtraction as requested)
            if (data.summary.tipsDelivered > 0) {
                doc.text(`- Propinas Entregadas:`, { continued: true });
                doc.text(`$${(data.summary.tipsDelivered || 0).toLocaleString('es-CO')}`, { align: 'right' });
            }

            doc.moveDown(0.2);
            doc.font('Courier-Bold');
            doc.text(`= EFECTIVO ESPERADO:`, { continued: true });
            doc.text(`$${(data.summary.expectedCash || 0).toLocaleString('es-CO')}`, { align: 'right' });

            doc.moveDown(0.3);
            doc.text(`EFECTIVO REAL (Arqueo):`, { continued: true });
            doc.text(`$${(data.summary.realCash || 0).toLocaleString('es-CO')}`, { align: 'right' });

            doc.moveDown(0.3);
            const diff = data.summary.difference;
            const diffLabel = diff > 0 ? 'SOBRANTE' : diff < 0 ? 'FALTANTE' : 'CUADRE';
            doc.text(`${diffLabel}:`, { continued: true });
            doc.text(`$${Math.abs(diff || 0).toLocaleString('es-CO')}`, { align: 'right' });

            doc.moveDown(0.5);
            doc.fontSize(10).text(`A ENTREGAR: $${(data.summary.cashToDeliver || 0).toLocaleString('es-CO')}`, { align: 'center' });

            doc.moveDown(0.5);
            doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();

            // --- OTHER MEANS ---
            doc.moveDown(0.2);
            doc.fontSize(9).text('OTROS MEDIOS', { align: 'center' });
            doc.fontSize(8).font('Courier');

            doc.text(`Ventas Tarjeta:`, { continued: true });
            doc.text(`$${(data.summary.totalCard || 0).toLocaleString('es-CO')}`, { align: 'right' });

            doc.text(`Ventas Transferencia:`, { continued: true });
            doc.text(`$${(data.summary.totalTransfer || 0).toLocaleString('es-CO')}`, { align: 'right' });

            doc.moveDown(1);
            doc.fontSize(7).text('www.panpanocha.com', { align: 'center' });

            doc.end();

            await new Promise<void>((resolve, reject) => {
                stream.on('finish', resolve);
                stream.on('error', reject);
            });

            console.log('[Printer] Combined Closing PDF saved to:', filePath);
            setTimeout(() => {
                shell.openPath(filePath);
            }, 500);

            return { success: true, filePath };
        } catch (error: any) {
            console.error('[Printer] Error generating combined PDF:', error);
            return { success: false, error: error.message };
        }
    });
};
