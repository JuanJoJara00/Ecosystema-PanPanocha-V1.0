
import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer';
import { app } from 'electron';

import { ClosingData, OrderDetailsData, CombinedClosingData, PrintTicketData } from './PrinterService.types';

export class PrinterService {
    private static instance: PrinterService;
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

    private constructor() { }

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
     * Prints a closing receipt (Cierre de Caja).
     * @param data The closing data including shift, summary, cash counts, etc.
     */
    public async printClosing(data: ClosingData): Promise<void> {
        console.log('[Printer] Starting closing print job');

        // Validate critical fields to prevent misleading receipts
        if (!data.shift || data.shift.initial_cash === undefined) {
            throw new Error('Invalid closing data: shift.initial_cash is required');
        }
        if (!data.summary) {
            throw new Error('Invalid closing data: summary is required');
        }
        if (data.cashCount === undefined) {
            throw new Error('Invalid closing data: cashCount is required');
        }

        const printer = this.createPrinter('receipt');

        const {
            shift,
            branch,
            user,
            summary,
            cashCount,
            cashCounts,
            difference,
            cashToDeliver,
            closingType,
            productsSold
        } = data;

        const dateNow = new Date();
        const dateStr = dateNow.toLocaleDateString('es-CO');
        const timeStr = dateNow.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });

        // --- Header ---
        printer.alignCenter();
        printer.bold(true);
        printer.setTextSize(1, 1);
        printer.println(this.organizationConfig?.name || "PANPANOCHA");
        printer.setTextNormal();
        printer.println("CIERRE DE CAJA");
        printer.println(`Tipo: ${closingType ? closingType.toUpperCase() : 'PARCIAL'}`);
        printer.newLine();

        // --- Info ---
        printer.alignLeft();
        printer.println(`Sede: ${branch?.name || 'Principal'}`);
        printer.println(`Cajero: ${user?.full_name || 'Staff'}`);
        printer.println(`Fecha: ${dateStr} ${timeStr}`);
        printer.println(`Turno: ${shift?.turn_type || 'Único'}`);
        printer.drawLine();

        // --- Sales Summary ---
        printer.alignCenter();
        printer.bold(true);
        printer.println("RESUMEN DE VENTAS");
        printer.bold(false);
        printer.alignLeft();
        printer.drawLine();

        const totalSales = summary?.totalSales || 0;
        const cashSales = summary?.cashSales || 0;
        const cardSales = summary?.cardSales || 0;
        const transferSales = summary?.transferSales || 0;
        const totalExpenses = summary?.totalExpenses || 0;
        const salesCount = summary?.salesCount || 0;

        printer.tableCustom([
            { text: `Ventas (#${salesCount})`, align: "LEFT", width: 0.5 },
            { text: `$${totalSales.toLocaleString('es-CO')}`, align: "RIGHT", width: 0.5 }
        ]);
        printer.tableCustom([
            { text: `  Efectivo`, align: "LEFT", width: 0.5 },
            { text: `$${cashSales.toLocaleString('es-CO')}`, align: "RIGHT", width: 0.5 }
        ]);
        printer.tableCustom([
            { text: `  Tarjeta`, align: "LEFT", width: 0.5 },
            { text: `$${cardSales.toLocaleString('es-CO')}`, align: "RIGHT", width: 0.5 }
        ]);
        printer.tableCustom([
            { text: `  Transf.`, align: "LEFT", width: 0.5 },
            { text: `$${transferSales.toLocaleString('es-CO')}`, align: "RIGHT", width: 0.5 }
        ]);

        printer.newLine();
        printer.tableCustom([
            { text: `Gastos Caja`, align: "LEFT", width: 0.5 },
            { text: `-$${totalExpenses.toLocaleString('es-CO')}`, align: "RIGHT", width: 0.5 }
        ]);

        printer.drawLine();

        // --- Arqueo (Cash Inventory) ---
        printer.alignCenter();
        printer.bold(true);
        printer.println("ARQUEO DE CAJA");
        printer.bold(false);
        printer.drawLine();
        printer.alignLeft();

        if (cashCounts) {
            printer.bold(true);
            printer.println("MONEDAS");
            printer.bold(false);
            [1000, 500, 200, 100, 50].forEach(denom => {
                const count = cashCounts[denom] || cashCounts[String(denom)] || 0;
                if (count > 0) {
                    printer.tableCustom([
                        { text: `  ${denom}`, align: "LEFT", width: 0.4 },
                        { text: `x ${count}`, align: "LEFT", width: 0.2 },
                        { text: `$${(denom * count).toLocaleString('es-CO')}`, align: "RIGHT", width: 0.4 }
                    ]);
                }
            });

            printer.newLine();
            printer.bold(true);
            printer.println("BILLETES");
            printer.bold(false);
            [2000, 5000, 10000, 20000, 50000, 100000].forEach(denom => {
                const count = cashCounts[denom] || cashCounts[String(denom)] || 0;
                if (count > 0) {
                    printer.tableCustom([
                        { text: `  ${denom}`, align: "LEFT", width: 0.4 },
                        { text: `x ${count}`, align: "LEFT", width: 0.2 },
                        { text: `$${(denom * count).toLocaleString('es-CO')}`, align: "RIGHT", width: 0.4 }
                    ]);
                }
            });
            printer.newLine();
        }

        // --- Validation ---
        const expectedCash = (shift?.initial_cash || 0) + cashSales - totalExpenses;

        printer.tableCustom([
            { text: `Base Info`, align: "LEFT", width: 0.6 },
            { text: `$${(shift?.initial_cash || 0).toLocaleString('es-CO')}`, align: "RIGHT", width: 0.4 }
        ]);
        printer.tableCustom([
            { text: `ESPERADO`, align: "LEFT", width: 0.6 },
            { text: `$${expectedCash.toLocaleString('es-CO')}`, align: "RIGHT", width: 0.4 }
        ]);
        printer.tableCustom([
            { text: `CONTADO`, align: "LEFT", width: 0.6 },
            { text: `$${(cashCount || 0).toLocaleString('es-CO')}`, align: "RIGHT", width: 0.4 }
        ]);

        const diffLabel = (difference || 0) > 0 ? 'SOBRANTE' : (difference || 0) < 0 ? 'FALTANTE' : 'CUADRE';
        printer.bold(true);
        printer.tableCustom([
            { text: diffLabel, align: "LEFT", width: 0.6 },
            { text: `$${Math.abs(difference || 0).toLocaleString('es-CO')}`, align: "RIGHT", width: 0.4 }
        ]);

        printer.drawLine();
        printer.setTextSize(1, 1);
        printer.println(`A ENTREGAR: $${(cashToDeliver || 0).toLocaleString('es-CO')}`);
        printer.setTextNormal();
        printer.drawLine();

        // --- Signatures ---
        printer.newLine();
        printer.newLine();
        printer.println("_".repeat(20));
        printer.println("Firma Cajero");
        printer.newLine();
        printer.newLine();
        printer.println("_".repeat(20));
        printer.println("Firma Encargado");

        printer.cut();

        // --- Products Receipt (Optional) ---
        if (productsSold && productsSold.length > 0) {
            printer.newLine();
            printer.newLine();
            printer.alignCenter();
            printer.bold(true);
            printer.println("REPORTE DE PRODUCTOS");
            printer.println("(ANEXO AL CIERRE)");
            printer.setTextNormal();
            printer.alignLeft();
            printer.drawLine();

            productsSold.forEach((p: any) => {
                const pName = (p.name || '').slice(0, 25);
                printer.tableCustom([
                    { text: pName, align: "LEFT", width: 0.7 },
                    { text: `x${p.quantity}`, align: "RIGHT", width: 0.3 }
                ]);
            });
            printer.cut();
        }

        try {
            await printer.execute();
            console.log('[Printer] Closing print success');
        } catch (error) {
            console.error('[Printer] Closing print failed:', error);
            throw error;
        }
    }

    /**
     * Prints a detailed list of products (Order Details).
     */
    public async printOrderDetails(data: OrderDetailsData): Promise<void> {
        console.log('[Printer] Starting order details print job');

        // Validate items array
        if (!data.items || !Array.isArray(data.items)) {
            throw new Error('Invalid order details: items array is required');
        }
        if (data.items.length === 0) {
            throw new Error('Invalid order details: items array cannot be empty');
        }

        // Validate each item has required numeric fields
        const invalidItems = data.items.filter(item =>
            !item.name ||
            typeof item.quantity !== 'number' ||
            typeof item.price !== 'number' ||
            isNaN(item.quantity) ||
            isNaN(item.price)
        );

        if (invalidItems.length > 0) {
            throw new Error(`Invalid order details: ${invalidItems.length} item(s) missing required numeric fields (name, quantity, price)`);
        }

        const printer = this.createPrinter('receipt');

        const { items, user } = data;
        const dateNow = new Date();
        const dateStr = dateNow.toLocaleString('es-CO');

        // Header
        printer.alignCenter();
        printer.bold(true);
        printer.println(this.organizationConfig?.name || "PANPANOCHA");
        printer.setTextNormal();
        printer.println("DETALLE DE PRODUCTOS");
        printer.println(dateStr);
        if (user) printer.println(`Cajero: ${user.full_name || 'Staff'}`);
        printer.drawLine();

        // Items (now guaranteed to have valid data)
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
            console.log('[Printer] Order details print success');
        } catch (error) {
            console.error('[Printer] Order details print failed:', error);
            throw error;
        }
    }

    /**
     * Prints a combined closing receipt (Cierre Total).
     */
    public async printCombinedClosing(data: CombinedClosingData): Promise<void> {
        console.log('[Printer] Starting combined closing print job');

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

        // Info
        printer.alignLeft();
        printer.println(`Fecha: ${dateNow.toLocaleDateString('es-CO')}`);
        printer.println(`Hora: ${dateNow.toLocaleTimeString('es-CO')}`);
        printer.println(`Turno: ${shift?.name || 'General'}`);
        printer.println(`Responsable: ${user?.full_name || 'N/A'}`);
        printer.drawLine();

        // Summary
        printer.alignCenter();
        printer.bold(true);
        printer.println("RESUMEN CONSOLIDADO");
        printer.bold(false);
        printer.alignLeft();
        printer.drawLine();

        printer.tableCustom([
            { text: `Base Inicial Total:`, align: "LEFT", width: 0.6 },
            { text: `$${(summary.totalBase || 0).toLocaleString('es-CO')}`, align: "RIGHT", width: 0.4 }
        ]);
        printer.tableCustom([
            { text: `+ Ventas Efectivo:`, align: "LEFT", width: 0.6 },
            { text: `$${(summary.totalCashSales || 0).toLocaleString('es-CO')}`, align: "RIGHT", width: 0.4 }
        ]);
        printer.tableCustom([
            { text: `- Gastos Operativos:`, align: "LEFT", width: 0.6 },
            { text: `$${(summary.totalExpenses || 0).toLocaleString('es-CO')}`, align: "RIGHT", width: 0.4 }
        ]);

        if ((summary.tipsDelivered || 0) > 0) {
            printer.tableCustom([
                { text: `- Propinas Entregadas:`, align: "LEFT", width: 0.6 },
                { text: `$${(summary.tipsDelivered || 0).toLocaleString('es-CO')}`, align: "RIGHT", width: 0.4 }
            ]);
        }

        printer.drawLine();
        printer.bold(true);
        printer.tableCustom([
            { text: `= EFECTIVO ESPERADO:`, align: "LEFT", width: 0.6 },
            { text: `$${(summary.expectedCash || 0).toLocaleString('es-CO')}`, align: "RIGHT", width: 0.4 }
        ]);
        printer.tableCustom([
            { text: `EFECTIVO REAL:`, align: "LEFT", width: 0.6 },
            { text: `$${(summary.realCash || 0).toLocaleString('es-CO')}`, align: "RIGHT", width: 0.4 }
        ]);

        const diff = summary.difference;
        const diffLabel = (diff || 0) > 0 ? 'SOBRANTE' : (diff || 0) < 0 ? 'FALTANTE' : 'CUADRE';
        printer.tableCustom([
            { text: `${diffLabel}:`, align: "LEFT", width: 0.6 },
            { text: `$${Math.abs(diff || 0).toLocaleString('es-CO')}`, align: "RIGHT", width: 0.4 }
        ]);

        printer.drawLine();
        printer.setTextSize(1, 1);
        printer.println(`A ENTREGAR: $${(summary.cashToDeliver || 0).toLocaleString('es-CO')}`);
        printer.setTextNormal();
        printer.drawLine();

        // Other Means
        printer.alignCenter();
        printer.bold(true);
        printer.println("OTROS MEDIOS");
        printer.bold(false);
        printer.alignLeft();
        printer.drawLine();

        printer.tableCustom([
            { text: `Ventas Tarjeta:`, align: "LEFT", width: 0.6 },
            { text: `$${(summary.totalCard || 0).toLocaleString('es-CO')}`, align: "RIGHT", width: 0.4 }
        ]);
        printer.tableCustom([
            { text: `Ventas Transferencia:`, align: "LEFT", width: 0.6 },
            { text: `$${(summary.totalTransfer || 0).toLocaleString('es-CO')}`, align: "RIGHT", width: 0.4 }
        ]);

        printer.cut();

        try {
            await printer.execute();
            console.log('[Printer] Combined closing print success');
        } catch (error) {
            console.error('[Printer] Combined closing print failed:', error);
            throw error;
        }
    }
}
