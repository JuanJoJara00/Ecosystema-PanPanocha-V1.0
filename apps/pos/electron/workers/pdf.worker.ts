
import { parentPort } from 'worker_threads';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Helper to load logo
const getLogoPath = (isPackaged: boolean, resourcesPath: string) => {
    // In dev: .../apps/pos/public/images/logo_v2.png
    // In prod: .../resources/public/images/logo_v2.png (if we copy it there)
    // Or we can pass the absolute path from main process to be safe.
    return '';
};

// Listen for messages from the Main Process
parentPort?.on('message', async (task: { type: string; payload: any; outputInfo: { path: string }; assets?: { logoPath?: string } }) => {
    console.log(`[Worker] Received task: ${task.type}`);

    try {
        const doc = new PDFDocument({
            size: [226.77, 841.89], // 80mm width
            margins: { top: 10, bottom: 10, left: 10, right: 10 }
        });

        // Ensure directory exists
        const dir = path.dirname(task.outputInfo.path);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const stream = fs.createWriteStream(task.outputInfo.path);
        doc.pipe(stream);

        // --- LOGIC DISPATCHER ---
        if (task.type === 'GENERATE_TICKET') {
            generateTicket(doc, task.payload, task.assets?.logoPath);
        } else if (task.type === 'GENERATE_CLOSING') {
            // TODO: Implement Closing Logic
            generateClosing(doc, task.payload, task.assets?.logoPath);
        }
        // ------------------------

        doc.end();

        stream.on('finish', () => {
            parentPort?.postMessage({ status: 'SUCCESS', path: task.outputInfo.path });
        });

        stream.on('error', (err) => {
            throw err;
        });

    } catch (error) {
        console.error('[Worker] Error:', error);
        parentPort?.postMessage({ status: 'ERROR', error: error instanceof Error ? error.message : 'Unknown error' });
    }
});

function generateTicket(doc: PDFKit.PDFDocument, saleData: any, logoPath?: string) {
    const { sale, items, client, paymentData, branch, user } = saleData;

    // === LOGO ===
    if (logoPath && fs.existsSync(logoPath)) {
        try {
            doc.image(logoPath, 88, 15, { width: 50, height: 50 });
            doc.y = 75;
        } catch (e) {
            console.error('[Worker] Logo error:', e);
        }
    }

    // === HEADER ===
    doc.font('Courier-Bold');
    doc.fontSize(11).text('PANPANOCHA', { align: 'center' });
    doc.fontSize(8).font('Courier').text(branch?.nit ? `NIT: ${branch.nit}` : 'NIT: 1008171201', { align: 'center' });
    doc.text('CADA INSTANTE TIENE MAGIA', { align: 'center' });

    doc.moveDown(0.3);
    doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
    doc.moveDown(0.3);

    // === INFO ===
    doc.fontSize(9).font('Courier-Bold').text('SEDE: ' + (branch?.name || 'Principal').toUpperCase());
    doc.fontSize(8).font('Courier');
    if (branch?.address) doc.text('Dir: ' + branch.address);
    if (branch?.phone) doc.text('Tel: ' + branch.phone);
    doc.moveDown(0.5);

    const dateStr = new Date(sale.created_at).toLocaleDateString('es-CO');
    const timeStr = new Date(sale.created_at).toLocaleTimeString('es-CO');

    doc.text(`Tiquete: ${sale.id.slice(0, 8)}`);
    doc.text(`Fecha: ${dateStr} ${timeStr}`);
    doc.text(`Cajero: ${user?.full_name || 'Staff'}`);

    // === PRODUCTS ===
    doc.moveDown(0.5);
    doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
    doc.moveDown(0.2);

    items.forEach((item: any) => {
        const name = (item.product_name || 'Producto').toUpperCase(); // Ensure payload has product_name
        const price = (item.unit_price || 0).toLocaleString('es-CO');
        const qty = item.quantity || 0;
        const subtotal = (item.total_price || 0).toLocaleString('es-CO');

        doc.font('Courier-Bold').fontSize(9).text(name);
        if (item.note) {
            doc.font('Courier-Oblique').fontSize(8).text(`  (${item.note})`);
        }
        doc.font('Courier').fontSize(8);
        doc.text(`  $${price} x ${qty}`, { continued: true });
        doc.text(`$${subtotal}`, { align: 'right' });
        doc.moveDown(0.2);
    });

    // === TOTALS ===
    doc.moveDown(0.5);
    doc.moveTo(10, doc.y).lineTo(216.77, doc.y).stroke();
    doc.moveDown(0.2);

    doc.fontSize(10).font('Courier-Bold');
    doc.text('TOTAL:', { continued: true });
    doc.text(`$${(sale.total_amount || 0).toLocaleString('es-CO')}`, { align: 'right' });

    doc.moveDown(1);
    doc.fontSize(8).font('Courier').text('Gracias por su compra', { align: 'center' });
}

function generateClosing(doc: PDFKit.PDFDocument, data: any, logoPath?: string) {
    // Placeholder for closing logic - can be migrated from main.ts later or now
    doc.fontSize(12).text('Cierre de Caja - Placeholder');
}
