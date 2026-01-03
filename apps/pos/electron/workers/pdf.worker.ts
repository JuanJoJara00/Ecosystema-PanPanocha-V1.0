import { parentPort } from 'worker_threads';
import PDFDocument from 'pdfkit';
import fs from 'fs';


// Define types to match the messages sent from PrinterService
type WorkerTask =
    | { type: 'GENERATE_CLOSING'; payload: any; outputInfo: { path: string }; assets: { logoPath: string; companyName?: string; nit?: string } };

if (!parentPort) {
    throw new Error('This file must be run as a worker thread');
}

parentPort.on('message', async (task: WorkerTask) => {
    try {
        if (task.type === 'GENERATE_CLOSING') {
            await generateClosingPDF(task.payload, task.outputInfo.path, task.assets);
            parentPort?.postMessage({ status: 'SUCCESS', path: task.outputInfo.path });
        } else {
            throw new Error(`Unknown task type: ${(task as any).type}`);
        }
    } catch (error: any) {
        parentPort?.postMessage({ status: 'ERROR', error: error.message });
    }
});

async function generateClosingPDF(data: any, outputPath: string, assets: { logoPath: string; companyName?: string; nit?: string }) {
    return new Promise<void>((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const stream = fs.createWriteStream(outputPath);

            doc.pipe(stream);

            // --- Header ---
            if (fs.existsSync(assets.logoPath)) {
                doc.image(assets.logoPath, 50, 45, { width: 50 });
            }

            doc.fontSize(20).text(assets.companyName || 'PAN PANOCHA', 110, 50);
            doc.fontSize(10).text(`Nit: ${assets.nit || '900.123.456-7'}`, 110, 75);
            doc.moveDown();

            doc.fontSize(16).text('CIERRE DE CAJA', { align: 'center' });
            doc.fontSize(12).text(`Tipo: ${data.closingType || 'PARCIAL'}`, { align: 'center' });
            doc.moveDown();

            // --- Metadata ---
            const date = new Date().toLocaleString('es-CO');
            doc.fontSize(10);
            doc.text(`Fecha: ${date}`, { align: 'right' });
            doc.text(`Cajero: ${data.user?.full_name || 'N/A'}`);
            doc.text(`Sede: ${data.branch?.name || 'Principal'}`);
            doc.text(`Turno: ${data.shift?.id?.substring(0, 8) || 'N/A'}`);
            doc.moveDown();

            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown();

            // --- Summary ---
            doc.fontSize(14).text('RESUMEN DE VENTAS');
            doc.moveDown(0.5);
            doc.fontSize(10);

            const summary = data.summary || {};
            const rows = [
                ['Ventas Totales', `$${(summary.totalSales || 0).toLocaleString('es-CO')}`],
                ['Efectivo', `$${(summary.cashSales || 0).toLocaleString('es-CO')}`],
                ['Tarjeta', `$${(summary.cardSales || 0).toLocaleString('es-CO')}`],
                ['Transferencia', `$${(summary.transferSales || 0).toLocaleString('es-CO')}`],
                ['Gastos', `-$${(summary.totalExpenses || 0).toLocaleString('es-CO')}`]
            ];

            let y = doc.y;
            rows.forEach(([label, value]) => {
                doc.text(label, 50, y);
                doc.text(value, 400, y, { align: 'right' });
                y += 15;
            });
            doc.y = y;
            doc.moveDown();

            // --- Validation ---
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown();
            doc.fontSize(12).text('VALIDACIÓN');
            doc.moveDown(0.5);

            y = doc.y;
            doc.fontSize(10);

            const expected = (data.shift?.initial_cash || 0) + (summary.cashSales || 0) - (summary.totalExpenses || 0);
            const real = data.cashCount || 0;
            const diff = data.difference || 0;

            doc.text('Base Inicial:', 50, y);
            doc.text(`$${(data.shift?.initial_cash || 0).toLocaleString('es-CO')}`, 400, y, { align: 'right' });
            y += 15;

            doc.text('Efectivo Esperado:', 50, y);
            doc.text(`$${expected.toLocaleString('es-CO')}`, 400, y, { align: 'right' });
            y += 15;

            doc.text('Efectivo Real (Contado):', 50, y);
            doc.text(`$${real.toLocaleString('es-CO')}`, 400, y, { align: 'right' });
            y += 15;

            doc.font('Helvetica-Bold');
            const diffLabel = diff > 0 ? 'SOBRANTE' : diff < 0 ? 'FALTANTE' : 'CUADRE';
            const diffColor = diff !== 0 ? 'red' : 'green';

            doc.fillColor(diffColor).text(`${diffLabel}:`, 50, y);
            doc.text(`$${Math.abs(diff).toLocaleString('es-CO')}`, 400, y, { align: 'right' });
            doc.fillColor('black').font('Helvetica');
            y += 25;

            doc.fontSize(14).text(`A ENTREGAR: $${(data.cashToDeliver || 0).toLocaleString('es-CO')}`, 50, y, { align: 'center' });
            doc.moveDown(2);

            // --- Signatures ---
            y = doc.y + 50;
            doc.moveTo(50, y).lineTo(200, y).stroke();
            doc.moveTo(350, y).lineTo(500, y).stroke();

            doc.fontSize(10);
            doc.text('Firma Cajero', 50, y + 5, { width: 150, align: 'center' });
            doc.text('Firma Supervisor', 350, y + 5, { width: 150, align: 'center' });

            doc.end();

            stream.on('finish', resolve);
            stream.on('error', reject);

        } catch (e) {
            reject(e);
        }
    });
}
