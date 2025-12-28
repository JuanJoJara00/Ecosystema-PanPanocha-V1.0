
import { Worker } from 'worker_threads';
import path from 'path';
import { app } from 'electron';

export class PrinterService {
    private worker: Worker;
    private static instance: PrinterService;

    private constructor() {
        // Resolve worker path dynamically based on prod (asar) vs dev environment
        // In Dev: We point to the TS file (using ts-node/vite approach) or the compiled JS if build process handles it.
        // For Electron with Vite, usually we need to point to the built asset.

        let workerPath = '';

        if (app.isPackaged) {
            // In production, resources are unpacked or bundled.
            // Assuming we configure vite/electron-builder to output worker to dist-electron/workers/
            workerPath = path.join(app.getAppPath(), 'dist-electron', 'workers', 'pdf.worker.js');
            // OR using resourcesPath if we use extraResources
            // workerPath = path.join(process.resourcesPath, 'workers', 'pdf.worker.js');
        } else {
            // In Dev, we can try to point to the source if running with ts-node, 
            // BUT electron workers usually need to be JS. 
            // We'll rely on the build process having transpiled it, or use ts-node register for worker.
            // For 'vite-plugin-electron', it usually builds to dist-electron.
            workerPath = path.join(__dirname, '../dist-electron/workers/pdf.worker.js');

            // Fallback for direct TS execution (requires worker loader or similar)
            if (!require('fs').existsSync(workerPath)) {
                // Try assuming it's in the same src dir but we need a way to run it.
                // Simplest for now: Assume user will run a build command or we rely on main.js being in dist-electron.
                // If main.ts is in electron/main.ts, __dirname in dev usually points to electron/
                // Let's assume we will build the worker to dist-electron/pdf.worker.js
                workerPath = path.join(__dirname, '../../dist-electron/pdf.worker.js');
            }
        }

        console.log('[PrinterService] Initializing worker at:', workerPath);

        this.worker = new Worker(workerPath);

        this.worker.on('error', (err) => console.error('[PrinterService] Worker Error:', err));
        this.worker.on('exit', (code) => {
            if (code !== 0) console.error(`[PrinterService] Worker stopped with exit code ${code}`);
        });
    }

    public static getInstance(): PrinterService {
        if (!PrinterService.instance) {
            PrinterService.instance = new PrinterService();
        }
        return PrinterService.instance;
    }

    public async printTicket(ticketData: any): Promise<string> {
        return new Promise((resolve, reject) => {
            // Temp path for PDF
            const filename = `Ticket_${Date.now()}.pdf`;
            const outputPath = path.join(app.getPath('temp'), filename);

            // Logo path resolution
            const logoPath = app.isPackaged
                ? path.join(process.resourcesPath, 'public', 'images', 'logo_v2.png')
                : path.join(__dirname, '../../public/images/logo_v2.png');

            const listener = (message: any) => {
                if (message.path === outputPath) {
                    // this.worker.off('message', listener); // This removes ALL listeners if not careful, better to verify ID?
                    // Since we don't have task IDs in this simple implementation, we assume serial or unique paths.
                    // A better way is to use a correlation ID.
                    if (message.status === 'SUCCESS') resolve(message.path);
                    else reject(new Error(message.error));

                    // Clean up this listener? 
                    // In a real generic implementation we'd map correlation IDs to resolvers.
                    // For now, we leave it or we'd need to implementing a proper dispatcher.
                }
            };

            this.worker.on('message', listener);

            // Send task to worker
            this.worker.postMessage({
                type: 'GENERATE_TICKET',
                payload: ticketData,
                outputInfo: { path: outputPath },
                assets: { logoPath }
            });
        });
    }
}
