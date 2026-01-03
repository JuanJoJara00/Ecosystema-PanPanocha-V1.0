
import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer';
import { app } from 'electron';
import { Worker } from 'worker_threads';
import path from 'path';
import { PathResolver } from '../utils/PathResolver';

import { ClosingData, OrderDetailsData, CombinedClosingData, PrintTicketData } from './PrinterService.types';

// Strict typing for worker messages
type WorkerTask =
    | { type: 'GENERATE_CLOSING'; payload: any; outputInfo: { path: string }; assets: any };

export class PrinterService {
    private static instance: PrinterService;
    private worker: Worker | null = null;

    private organizationConfig?: {
        name: string;
        nit: string;
        website?: string;
    };

    // Configurable printer targets - in production this should come from config/store
    private printers: Record<string, string> = {
        'receipt': 'EPSON TM-T20III', // Example System Driver Name
        'kitchen': 'EPSON TM-U220'
    };

    private constructor() {
        this.initWorker();
    }

    private workerRestartAttempts = 0;
    private readonly MAX_RESTART_ATTEMPTS = 3;

    private initWorker() {
        try {
            const workerPath = PathResolver.worker;
            console.log('[PrinterService] Initializing worker at:', workerPath);
            this.worker = new Worker(workerPath);

            this.worker.on('error', (err) => {
                console.error('[PrinterService] 💥 Worker CRITICAL Error:', err);
                if (this.workerRestartAttempts < this.MAX_RESTART_ATTEMPTS) {
                    this.workerRestartAttempts++;
                    const delay = 1000 * this.workerRestartAttempts; // Exponential-ish backoff
                    console.log(`[PrinterService] Restarting worker in ${delay}ms (attempt ${this.workerRestartAttempts}/${this.MAX_RESTART_ATTEMPTS})`);
                    setTimeout(() => this.initWorker(), delay);
                } else {
                    console.error('[PrinterService] Max restart attempts reached, worker disabled');
                }
            });
            this.workerRestartAttempts = 0; // Reset on successful init
            console.log('[PrinterService] Worker initialized successfully');
        } catch (error) {
            console.error('[PrinterService] Failed to initialize worker:', error);
        }
    }

    public static getInstance(): PrinterService {
        if (!PrinterService.instance) {
            PrinterService.instance = new PrinterService();
        }
        return PrinterService.instance;
    }

    public setOrganizationConfig(config: { name: string; nit: string; website?: string }) {
        this.organizationConfig = config;
    }

    /**
     * WHY: Generic wrapper to handle the Promise/Event loop of the worker.
     * Prevents code duplication for different print types.
     */
    private executeTask(task: WorkerTask): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                // Try to re-init
                this.initWorker();
                if (!this.worker) return reject(new Error('Worker not initialized'));
            }

            const WORKER_RESPONSE_TIMEOUT_MS = 10000; // 10s timeout
            const timeout = setTimeout(() => {
                this.worker?.off('message', listener);
                reject(new Error('Worker response timeout'));
            }, WORKER_RESPONSE_TIMEOUT_MS);

            const listener = (message: any) => {
                // WHY: Verify the message matches the expected output path 
                // to avoid race conditions if multiple prints happen fast.
                if (message.path === task.outputInfo.path) {
                    clearTimeout(timeout);
                    this.worker?.off('message', listener); // Cleanup listener to prevent memory leaks

                    if (message.status === 'SUCCESS') resolve(message.path);
                    else reject(new Error(message.error || 'Unknown Worker Error'));
                }
            };

            this.worker.on('message', listener);
            this.worker.postMessage(task);
        });
    }

    /**
     * Creates a configured thermal printer instance for the given target.
     */
    private createPrinter(target: 'receipt' | 'kitchen' = 'receipt'): ThermalPrinter {
        const printerName = this.printers[target];
        if (!printerName) {
            throw new Error(`Unknown printer target: ${target}. Available: ${Object.keys(this.printers).join(', ')}`);
        }
        return new ThermalPrinter({
            type: PrinterTypes.EPSON,
            interface: `printer:${printerName}`,
            characterSet: CharacterSet.PC852_LATIN2,
            removeSpecialCharacters: false,
            options: { timeout: 5000 }
        });
    }

    /**
     * Prints a standardized ticket to the specified target.
     * @param data The sale or order data
     * @param target 'receipt' (Customer Receipt) | 'kitchen' (Kitchen Order)
     */
    public async printTicket(data: PrintTicketData, target: 'receipt' | 'kitchen' = 'receipt'): Promise<void> {
        console.log(`[Printer] Starting print job for ${target}`);
        const printer = this.createPrinter(target);

        // --- Header ---
        printer.alignCenter();
        printer.bold(true);
        printer.setTextSize(1, 1);
        printer.println(this.organizationConfig?.name || "PAN PANOCHA");
        printer.bold(false);
        printer.setTextNormal();
        printer.println(`Nit: ${this.organizationConfig?.nit || "900.123.456-7"}`);
        printer.newLine();

        // --- Metadata ---
        printer.alignLeft();
        printer.println(`Fecha: ${new Date().toLocaleString('es-CO')}`);
        if (data.sale.shift_id) printer.println(`Turno: ${data.sale.shift_id}`);
        if (data.user?.full_name) printer.println(`Cajero: ${data.user.full_name}`);
        if (data.branch?.name) printer.println(`Sede: ${data.branch.name}`);
        printer.drawLine();

        // --- Items ---
        const isKitchen = target === 'kitchen';

        if (isKitchen) {
            printer.setTextSize(1, 1);
            printer.bold(true);
            printer.println("*** COCINA ***");
            printer.newLine();
        }

        // Handle items array
        const items = data.items || [];

        items.forEach((item) => {
            const qty = item.quantity || 1;
            const name = (item.product_name || item.name || 'Item').substring(0, isKitchen ? 40 : 20);

            if (isKitchen) {
                // Kitchen format: Quantity x Name (Big)
                printer.setTextSize(1, 1); // Double width/height
                printer.println(`${qty} x ${name}`);
                printer.setTextNormal(); // Reset for notes/padding
                if (item.notes) printer.println(`   * ${item.notes}`);
                printer.newLine();
            } else {
                // Receipt format: Quantity Name Price
                const price = item.total_price || ((item.unit_price || 0) * qty) || 0;
                // Simple table formatting manually since tableCustom implies specific column widths
                // Left aligned name, Right aligned price
                printer.tableCustom([
                    { text: `${qty} ${name}`, align: "LEFT", width: 0.65 },
                    { text: `$${price.toLocaleString('es-CO')}`, align: "RIGHT", width: 0.35 }
                ]);
            }
        });

        // --- Footer ---
        if (!isKitchen) {
            printer.newLine();
            printer.drawLine();
            printer.bold(true);
            printer.setTextSize(1, 1);
            const total = data.sale.total_amount || 0;
            printer.println(`TOTAL: $${total.toLocaleString('es-CO')}`);

            printer.newLine();
            printer.setTextNormal();
            printer.alignCenter();
            printer.println("Gracias por su compra!");
            printer.println(this.organizationConfig?.website || "www.panpanocha.com");
        }

        printer.cut();

        // --- Execution ---
        try {
            await printer.execute();
            console.log('[Printer] Print success');
        } catch (error) {
            console.error('[Printer] Print failed:', error);
            throw new Error(`Error de Impresión (${target}): ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Prints a closing receipt (Cierre de Caja) using PDF Worker (Non-blocking).
     * @param data The closing data including shift, summary, cash counts, etc.
     */
    public async printClosing(data: ClosingData): Promise<string> {
        console.log('[Printer] Offloading Closing Print to Worker...');

        const timestamp = Date.now();
        const filename = `Cierre_${timestamp}.pdf`;
        const outputPath = path.join(app.getPath('temp'), filename);

        // Resolve logo path safely for Prod/Dev
        let logoPath = '';
        try {
            logoPath = PathResolver.getAsset('images/logo_v2.png');
        } catch (e) {
            console.warn('[Printer] Could not resolve logo path', e);
        }

        return this.executeTask({
            type: 'GENERATE_CLOSING',
            payload: data,
            outputInfo: { path: outputPath },
            assets: {
                logoPath,
                companyName: this.organizationConfig?.name,
                nit: this.organizationConfig?.nit
            }
        });
    }

    /**
     * Prints a detailed list of products (Order Details).
     */
    public async printOrderDetails(data: OrderDetailsData): Promise<void> {
        // Keeping ESC/POS for now as it's typically a receipt roll
        console.log('[Printer] Starting order details print job');
        // ... (Re-using original logic format for thermal)

        // Validate items array
        if (!data.items || !Array.isArray(data.items)) {
            throw new Error('Invalid order details: items array is required');
        }
        if (data.items.length === 0) {
            throw new Error('Invalid order details: items array cannot be empty');
        }

        const printer = this.createPrinter('receipt');
        const { items, user } = data;
        const dateStr = new Date().toLocaleString('es-CO');

        // Header
        printer.alignCenter();
        printer.bold(true);
        printer.println(this.organizationConfig?.name || "PANPANOCHA");
        printer.setTextNormal();
        printer.println("DETALLE DE PRODUCTOS");
        printer.println(dateStr);
        if (user) printer.println(`Cajero: ${user.full_name || 'Staff'}`);
        printer.drawLine();

        // Items
        printer.alignLeft();
        items.forEach((item) => {
            const name = item.name.slice(0, 30);
            const qty = item.quantity;
            const price = item.price;
            const total = qty * price;

            printer.println(name);
            printer.tableCustom([
                { text: "", align: "LEFT", width: 0.1 },
                { text: `${qty} x $${price.toLocaleString('es-CO')} = $${total.toLocaleString('es-CO')}`, align: "RIGHT", width: 0.9 }
            ]);
        });

        printer.drawLine();
        const grandTotal = items.reduce((acc, i) => acc + (i.quantity * i.price), 0);
        printer.bold(true);
        printer.tableCustom([
            { text: "TOTAL:", align: "LEFT", width: 0.4 },
            { text: `$${grandTotal.toLocaleString('es-CO')}`, align: "RIGHT", width: 0.6 }
        ]);

        printer.println("_".repeat(20)); // Spacing
        printer.cut();

        try {
            await printer.execute();
        } catch (error) {
            throw new Error(`Error printing order details: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Prints a combined closing receipt (Cierre Total).
     * Currently keeping thermal, can migrate to PDF worker later if requested.
     */
    public async printCombinedClosing(data: CombinedClosingData): Promise<void> {
        console.log('[Printer] Starting combined closing print job (Thermal)');
        // ... (Original logic preserved for now to minimize risk unless explicitly asked to move this one too)

        // Validate summary contains required fields
        const requiredFields = [
            'totalBase', 'totalCashSales', 'totalExpenses',
            'expectedCash', 'realCash', 'difference',
            'cashToDeliver', 'totalCard', 'totalTransfer'
        ] as const;

        const missingFields = requiredFields.filter(field =>
            data.summary[field] === undefined || data.summary[field] === null
        );

        if (missingFields.length > 0) {
            throw new Error(`Invalid combined closing: summary missing required fields: ${missingFields.join(', ')}`);
        }

        const printer = this.createPrinter('receipt');
        const { shift, user, summary } = data;
        const dateNow = new Date();

        // Header
        printer.alignCenter();
        printer.bold(true);
        printer.println(this.organizationConfig?.name || "PANPANOCHA");
        printer.setTextNormal();
        printer.println("CIERRE TOTAL DE TURNO");
        printer.newLine();
        // Print Metadata
        printer.alignLeft();
        printer.println(`Fecha: ${dateNow.toLocaleString('es-CO')}`);
        if (user?.full_name) printer.println(`Responsable: ${user.full_name}`);
        if (shift?.id) printer.println(`Turno ID: ${shift.id.slice(0, 8)}...`);
        printer.drawLine();

        // Print Summary Table
        printer.tableCustom([
            { text: "Base:", align: "LEFT", width: 0.5 },
            { text: `$${summary.totalBase.toLocaleString('es-CO')}`, align: "RIGHT", width: 0.5 }
        ]);
        printer.tableCustom([
            { text: "Ventas Efectivo:", align: "LEFT", width: 0.5 },
            { text: `$${summary.totalCashSales.toLocaleString('es-CO')}`, align: "RIGHT", width: 0.5 }
        ]);
        printer.tableCustom([
            { text: "Ventas Tarjeta:", align: "LEFT", width: 0.5 },
            { text: `$${summary.totalCard.toLocaleString('es-CO')}`, align: "RIGHT", width: 0.5 }
        ]);
        printer.tableCustom([
            { text: "Ventas Transf:", align: "LEFT", width: 0.5 },
            { text: `$${summary.totalTransfer.toLocaleString('es-CO')}`, align: "RIGHT", width: 0.5 }
        ]);
        printer.tableCustom([
            { text: "Gastos:", align: "LEFT", width: 0.5 },
            { text: `-$${summary.totalExpenses.toLocaleString('es-CO')}`, align: "RIGHT", width: 0.5 }
        ]);

        printer.drawLine();

        // Cash Analysis
        printer.bold(true);
        printer.println("ANALISIS DE EFECTIVO");
        printer.bold(false);
        printer.tableCustom([
            { text: "Esperado:", align: "LEFT", width: 0.5 },
            { text: `$${summary.expectedCash.toLocaleString('es-CO')}`, align: "RIGHT", width: 0.5 }
        ]);
        printer.tableCustom([
            { text: "Real (Contado):", align: "LEFT", width: 0.5 },
            { text: `$${summary.realCash.toLocaleString('es-CO')}`, align: "RIGHT", width: 0.5 }
        ]);

        // Difference Highlight
        const diff = summary.difference;
        const diffLabel = diff === 0 ? "Cuadrado" : (diff > 0 ? "Sobrante" : "Faltante");
        printer.bold(true);
        printer.tableCustom([
            { text: `Dif. (${diffLabel}):`, align: "LEFT", width: 0.5 },
            { text: `$${diff.toLocaleString('es-CO')}`, align: "RIGHT", width: 0.5 }
        ]);

        printer.newLine();
        printer.setTextSize(1, 1);
        printer.println(`A ENTREGAR: $${summary.cashToDeliver.toLocaleString('es-CO')}`);
        printer.setTextNormal();
        printer.bold(false);

        printer.println("_".repeat(20));
        printer.cut();

        try {
            await printer.execute();
            console.log('[Printer] Combined closing print success');
        } catch (error) {
            throw new Error(`Error printing combined closing: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

