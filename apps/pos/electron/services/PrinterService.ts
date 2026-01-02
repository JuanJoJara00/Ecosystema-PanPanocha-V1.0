
import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer';
import { app } from 'electron';

export class PrinterService {
    private static instance: PrinterService;

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

    /**
     * Prints a standardized ticket to the specified target.
     * @param data The sale or order data
     * @param target 'receipt' (Customer Receipt) | 'kitchen' (Kitchen Order)
     */
    public async printTicket(data: any, target: 'receipt' | 'kitchen' = 'receipt'): Promise<void> {
        console.log(`[Printer] Starting print job for ${target}`);

        // In a real scenario, you might want to check if printer exists or is connected
        // For now, we instantiate the printer object which prepares the buffer.
        // Interface: 'printer:Name' uses the OS printer driver (CUPS/Windows Spooler)

        const printerName = this.printers[target];
        // Fallback or dynamic configuration could happen here

        const printer = new ThermalPrinter({
            type: PrinterTypes.EPSON,
            interface: `printer:${printerName}`,
            characterSet: CharacterSet.PC852_LATIN2,
            removeSpecialCharacters: false,
            options: { timeout: 5000 }
        });

        // --- Header ---
        printer.alignCenter();
        printer.bold(true);
        printer.setTextSize(1, 1);
        printer.println("PAN PANOCHA");
        printer.bold(false);
        printer.setTextNormal();
        printer.println("Nit: 900.123.456-7");
        printer.newLine();

        // --- Metadata ---
        printer.alignLeft();
        printer.println(`Fecha: ${new Date().toLocaleString('es-CO')}`);
        if (data.shift_id) printer.println(`Turno: ${data.shift_id}`);
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

        items.forEach((item: any) => {
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
                const price = item.total_price || (item.unit_price * qty) || 0;
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
            const total = data.total_amount || 0;
            printer.println(`TOTAL: $${total.toLocaleString('es-CO')}`);

            printer.newLine();
            printer.setTextNormal();
            printer.alignCenter();
            printer.println("Gracias por su compra!");
            printer.println("www.panpanocha.com");
        }

        printer.cut();

        // --- Execution ---
        try {
            // execute() sends the accumulated buffer to the printer interface
            await printer.execute();
            console.log('[Printer] Print success');
        } catch (error) {
            console.error('[Printer] Print failed:', error);
            // In dev environment without real printer, this will likely fail if driver not found.
            // We rethrow so UI knows, OR we swallow if we want to simulate success in Dev?
            // Let's rethrow to be honest about hardware state, but maybe log it clearly.
            throw new Error(`Error de Impresión (${target}): ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
