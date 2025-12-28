import { app } from 'electron';
import path from 'path';
import { PowerSyncDatabase } from '@powersync/node';
import { wrapPowerSyncWithDrizzle } from '@powersync/drizzle-driver';
import { AppSchema, schema } from './schema';
import { PowerSyncBackendConnector } from '@powersync/node';
import { PosDatabase } from './types';

// 1. Connector Logic
class POSConnector implements PowerSyncBackendConnector {
    async fetchCredentials() {
        return {
            endpoint: process.env.POWERSYNC_URL || 'https://placeholder.powersync.co',
            token: 'mock-jwt-token'
        };
    }
    async uploadData(batch: any) {
        console.log('[Sync] Uploading batch:', batch);
    }
}

// 2. Singleton Database Instance
let dbInstance: PosDatabase | null = null;

export const initDatabase = async (): Promise<PosDatabase> => {
    if (dbInstance) return dbInstance;

    console.log('[DB] Initializing Singleton...');
    const dbPath = path.join(app.getPath('userData'), 'pos-main-v2.db');

    // CRITICAL: Resolve worker path correctly for ASAR Unpacked vs Dev
    // Dev: __dirname/worker.js (compiled by tsc to same dir as index.js)
    // Prod: resources/app.asar.unpacked/dist-electron/db/worker.js
    let workerPath: string;
    if (app.isPackaged) {
        workerPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'dist-electron', 'db', 'worker.js');
    } else {
        workerPath = path.join(__dirname, 'worker.js');
    }

    console.log('[DB] Worker Path:', workerPath);

    const powerSync = new PowerSyncDatabase({
        schema: AppSchema,
        database: {
            dbFilename: dbPath,
            // Use 'as any' to bypass the mismatch between Node's Worker and the Web Worker interface expected by PowerSync types
            openWorker: (_, options) => new Worker(workerPath, options) as any,
        },
    });

    await powerSync.init();
    await powerSync.connect(new POSConnector());

    // Wrap with Drizzle
    const db = wrapPowerSyncWithDrizzle(powerSync, { schema });
    dbInstance = db;

    console.log("✅ [DB] Database Ready.");
    return db;
};

export const getDb = () => {
    if (!dbInstance) throw new Error('Database not initialized. Call initDatabase() first.');
    return dbInstance;
};
