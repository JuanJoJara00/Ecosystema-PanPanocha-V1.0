import { app } from 'electron';
import path from 'path';

/**
 * WHY: Electron's __dirname behaves differently in development vs production (ASAR).
 * Hardcoding paths leads to 'Module not found' or missing assets in the installer.
 * This utility acts as the Single Source of Truth for file system access.
 */
export class PathResolver {
    static get isDev(): boolean {
        return !app.isPackaged;
    }

    // Points to the root of the 'electron' folder in dev, or the app root in prod
    static get root(): string {
        if (this.isDev) {
            // In Dev, we are usually in apps/pos/electron or similar. 
            // Adjust this based on where this file effectively runs.
            // If this file is in apps/pos/electron/utils, .. is apps/pos/electron
            return path.join(__dirname, '..');
        }
        // In Prod, resourcesPath is the folder containing the ASAR and extraResources
        return process.resourcesPath;
    }

    static get public(): string {
        // In Dev: apps/pos/public (relative to electron folder which is passed as root?)
        // Actually, in standard Vite+Electron:
        // Dev: project_root/public or project_root/dist ?
        // Let's assume the standard 'public' folder is at the workspace root during dev relative to where main.ts runs.

        if (this.isDev) {
            // If main.ts is in apps/pos/electron/main.ts
            // and public is apps/pos/public
            // then from apps/pos/electron, we go up one level.
            return path.join(__dirname, '../../public');
        }
        // In Prod: resources/public (assuming you configure electron-builder extraResources)
        return path.join(process.resourcesPath, 'public');
    }

    static get worker(): string {
        if (this.isDev) {
            // Assuming Vite puts workers in dist-electron/workers or similar
            // Code is compiled to dist-electron usually.
            // If we are running from dist-electron/main.js
            return path.join(__dirname, 'workers/pdf.worker.js');
        }
        return path.join(app.getAppPath(), 'dist-electron', 'workers', 'pdf.worker.js');
    }

    static getAsset(assetPath: string): string {
        return path.join(this.public, assetPath);
    }
}
