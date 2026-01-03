import { app } from 'electron';
import path from 'path';
import { Worker } from 'worker_threads';
import { PowerSyncDatabase, PowerSyncBackendConnector } from '@powersync/node';
import { AppSchema, schema, sales } from './schema'; // Added sales
import { PosDatabase } from './types';
import { eq } from 'drizzle-orm'; // Added eq helper

// 1. Connector Logic
class POSConnector implements PowerSyncBackendConnector {
    private authToken: string | null = null;
    private branchId: string | null = null;

    setToken(token: string) {
        this.authToken = token;
    }

    setBranchId(id: string) {
        this.branchId = id;
    }

    async fetchCredentials() {
        // 1. Resolve Portal URL
        let portalUrl = process.env.PORTAL_API_URL || process.env.VITE_PORTAL_API_URL;

        if (!portalUrl) {
            if (process.env.NODE_ENV === 'production') {
                throw new Error('PORTAL_API_URL environment variable is missing in production.');
            }
            portalUrl = 'http://localhost:3000';
            console.warn('[PowerSync] No PORTAL_API_URL set, defaulting to localhost:3000');
        }

        console.log('[PowerSync] Fetching credentials from:', portalUrl);

        if (!this.authToken) {
            console.error('[PowerSync] No auth token available during fetchCredentials.');
            throw new Error('No auth token available for PowerSync');
        }

        // 2. Resolve Timeout
        const envTimeout = parseInt(process.env.POWERSYNC_TIMEOUT_MS || process.env.VITE_POWERSYNC_TIMEOUT_MS || '', 10);
        const timeoutMs = (!isNaN(envTimeout) && envTimeout > 0) ? envTimeout : 10000;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(`${portalUrl}/api/powersync/token`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errText = await response.text();
                // console.error handled in catch if re-thrown, but logging here is good too
                throw new Error(`Failed to fetch credentials: ${response.status} ${response.statusText} - ${errText}`);
            }

            const data = await response.json();
            console.log('[PowerSync] Credentials fetched successfully. Endpoint:', data.endpoint);

            return {
                endpoint: data.endpoint,
                token: data.token
            };
        } catch (error: any) {
            clearTimeout(timeoutId);
            console.error('[PowerSync] Credential Fetch Error:', error);

            // Re-throw so PowerSync knows it failed and can retry/backoff
            throw error;
        }
    }

    /**
     * Hybrid Sync Strategy (Graph API + PowerSync)
     * 
     * PowerSync sends us flat rows in the `batch` parameter. However, our backend API 
     * (`/api/pos/sync`) is designed to handle complex Graphs (e.g. Sales with nested Items) 
     * to ensure transactional integrity and validation of the entire order at once.
     * 
     * Therefore, we use a hybrid approach:
     * 1. Trigger: PowerSync's `uploadData` acts as the "trigger" that local changes exist.
     * 2. Monitor: We scan the `batch` to ensure we aren't ignoring unexpected data types.
     * 3. Sync: We explicitly query the local SQLite DB for unsynced Sales (Graph) and push 
     *    them to the API. This ensures the backend receives the full object it expects.
     * 
     * TODO: Future enhancement should either:
     * - Adapt the API to accept flat rows (PowerSync Native).
     * - Or implement `uploadBatchItems` to handle Shifts/Expenses directly from the batch.
     */
    async uploadData(batch: any) {
        if (!this.authToken) {
            console.warn('[PowerSync] No auth token, skipping upload.');
            throw new Error('No auth token');
        }

        // Monitoring: Check what's in the batch
        const counts = {
            sales: 0,
            sale_items: 0,
            shifts: 0,
            expenses: 0,
            others: 0
        };

        for (const op of batch.crud) {
            if (op.op === 'PUT' || op.op === 'PATCH') {
                switch (op.table) {
                    case 'sales': counts.sales++; break;
                    case 'sale_items': counts.sale_items++; break;
                    case 'shifts': counts.shifts++; break;
                    case 'expenses': counts.expenses++; break;
                    default: counts.others++; break;
                }
            }
        }

        console.log('[PowerSync] Batch Analysis:', counts);

        // Warning for unhandled types
        if (counts.shifts > 0) console.warn('⚠️ [Sync] Warning: Shifts detected in batch but currently ignored by Sync Strategy.');
        if (counts.expenses > 0) console.warn('⚠️ [Sync] Warning: Expenses detected in batch but currently ignored by Sync Strategy.');
        if (counts.others > 0) console.warn('⚠️ [Sync] Warning: Unknown tables detected in batch.');

        // Execute Graph Sync for Sales
        // This queries the DB directly for strict correctness
        if (counts.sales > 0 || counts.sale_items > 0) {
            console.log('[PowerSync] Triggering Sales Graph Sync...');
            await this.flushSalesGraph();
        } else {
            console.log('[PowerSync] No sales changes detected, skipping Graph Sync.');
        }

        // TODO: Implement flushShifts() or flushExpenses() here if needed
        // For now, we only support strictly Sales Graph Sync via this mechanism.
    }

    /**
     * Flushes local pending sales to the backend API as full Graph objects.
     */
    async flushSalesGraph() {
        // Re-implement the logic from SyncService here, using global db instance if available.
        // This satisfies "Use PowerSync Native" (hooking into uploadData) but keeps "Graph Sync" capability.

        const db = dbInstance;
        if (!db) {
            console.error('[PowerSync] Cannot flush outbox: Singleton DB not ready.');
            throw new Error('Database not initialized for sync'); // Critical: Throw so PowerSync retries
        }

        // ... Copy logic ...
        const pendingSales = await db.query.sales.findMany({
            where: (sales, { eq }) => eq(sales.synced, false),
            with: { items: true },
            limit: 50
        });

        // ... Push to API ...
        // If success, we don't need to tell PowerSync anything specific about rows, 
        // we just complete the uploadData call. PowerSync will re-call if we throw.

        if (pendingSales.length > 0) {
            console.log('[PowerSync] Pushing', pendingSales.length, 'sales via Custom Graph API');
            // TODO: Make actual fetch call here using net module or fetch
            const apiUrl = process.env.PORTAL_API_URL || process.env.VITE_PORTAL_API_URL || 'http://localhost:3000';
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };

            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s for sync

            try {
                const response = await fetch(`${apiUrl}/api/pos/sync`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        branch_id: this.branchId,
                        sales: pendingSales
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Sync failed: ${response.status} ${response.statusText} - ${errText}`);
                }
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }

            // Mark synced locally - PowerSync will see this as "local update" but that's fine.
            await db.transaction(async (tx) => {
                // Optimized: Static imports used
                for (const s of pendingSales) {
                    await tx.update(sales).set({ synced: true }).where(eq(sales.id, s.id));
                }
            });
        }
    }
}

export const connector = new POSConnector();

// 2. Singleton Database Instance
let dbInstance: PosDatabase | null = null;

export const initDatabase = async (): Promise<PosDatabase> => {
    if (dbInstance) return dbInstance;

    console.log('[DB] Initializing Singleton...');
    const dbPath = path.join(app.getPath('userData'), 'pos-main-v5.db');

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
            openWorker: (_, options) => new Worker(workerPath, options) as any,
        },
    });

    await powerSync.init();
    console.log('[DB] Connecting to PowerSync Service...');
    await powerSync.connect(connector);

    console.log('[DB] Importing Drizzle Driver...');
    const drizzleDriver = await import('@powersync/drizzle-driver');
    console.log('[DB] Drizzle Driver Imported:', drizzleDriver);
    const wrapPowerSyncWithDrizzle = drizzleDriver.wrapPowerSyncWithDrizzle;

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
