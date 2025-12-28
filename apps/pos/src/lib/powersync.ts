import { PowerSyncDatabase, WASQLitePowerSyncDatabaseOpenFactory } from '@powersync/web';

import { AppSchema } from './powersync_Schema';
import { SupabaseConnector } from './connector';

export class AppPowerSync {
    db: PowerSyncDatabase;
    connector: SupabaseConnector | null = null;
    _id: string = Math.random().toString(36).substring(7);
    isInitialized = false;
    initPromise: Promise<void> | null = null;

    constructor() {
        const factory = new WASQLitePowerSyncDatabaseOpenFactory({
            dbFilename: 'panpanocha_pos_v2.db',
            schema: AppSchema
        });

        this.db = new PowerSyncDatabase({
            schema: AppSchema,
            database: factory
        });
    }

    async init(url: string, token: string): Promise<void> {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            if (!url || !token) {
                console.warn("[AppPowerSync] Credentials missing.");
                return;
            }

            try {
                this.connector = new SupabaseConnector(url, token);

                // Debug listener inside class
                this.db.registerListener({
                    statusChanged: (status) => {
                    }
                });

                await this.db.connect(this.connector);
                this.isInitialized = true;
                console.log(`✅[AppPowerSync] Connected!(ID: ${this._id})`);

                // Check for credentials immediately
                if (!this.db.currentStatus.connected) {
                    console.log('[AppPowerSync Diagnostic] db.connected status immediately after await:', this.db.currentStatus.connected);
                    // Manually try to fetch credentials to see if connector is working
                    // ...
                }
            } catch (e) {
                console.error('❌ [AppPowerSync] Connection failed:', e);
                this.initPromise = null; // Reset on failure to allow retry
            }
        })();

        return this.initPromise;
    }
}

export const powerSync = new AppPowerSync();
