// @ts-ignore
import { startPowerSyncWorker } from '@powersync/node/worker';
import Database from 'better-sqlite3';

startPowerSyncWorker({
    loadBetterSqlite3: async () => Database
});
