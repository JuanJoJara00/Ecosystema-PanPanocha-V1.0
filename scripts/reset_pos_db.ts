import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Utility to wipe the local POS database ("pos-main-v5.db").
 * Helpful for resetting state during development/testing.
 */

const appName = "POS PanPanocha"; // Product Name from electron-builder
const dbName = "pos-main-v5.db";

// Typical User Data Paths on Windows
const candidates = [
    // Production / Installed App
    path.join(os.homedir(), 'AppData', 'Roaming', appName, dbName),
    // Development (often just "Electron" or the package name)
    path.join(os.homedir(), 'AppData', 'Roaming', 'Electron', dbName),
    path.join(os.homedir(), 'AppData', 'Roaming', '@panpanocha', 'pos', dbName), // Scoped name fallback
    // Linux/Mac fallbacks (just in case)
    path.join(os.homedir(), '.config', appName, dbName),
    path.join(os.homedir(), 'Library', 'Application Support', appName, dbName)
];

console.log(`🔍 Searching for ${dbName}...`);
let found = false;

candidates.forEach(dbPath => {
    const dir = path.dirname(dbPath);

    // 1. Delete Database
    if (fs.existsSync(dbPath)) {
        console.log(`✅ Found database at: ${dbPath}`);
        try {
            const shm = `${dbPath}-shm`;
            const wal = `${dbPath}-wal`;
            if (fs.existsSync(shm)) fs.unlinkSync(shm);
            if (fs.existsSync(wal)) fs.unlinkSync(wal);
            fs.unlinkSync(dbPath);
            console.log(`🗑️  Deleted database successfully.`);
            found = true;
        } catch (e: any) {
            console.error(`❌ Failed to delete DB ${dbPath}:`, e.message);
        }
    }

    // 2. Delete Config / storage (Credentials)
    const configPath = path.join(dir, 'config.json');
    if (fs.existsSync(configPath)) {
        try {
            fs.unlinkSync(configPath);
            console.log(`🗑️  Deleted config.json (Credentials reset) at ${configPath}`);
            found = true;
        } catch (e: any) {
            console.error(`❌ Failed to delete config ${configPath}:`, e.message);
        }
    }

    const localStoragePath = path.join(dir, 'Local Storage');
    if (fs.existsSync(localStoragePath)) {
        try {
            fs.rmSync(localStoragePath, { recursive: true, force: true });
            console.log(`🗑️  Deleted Local Storage at ${localStoragePath}`);
            found = true;
        } catch (e: any) {
            console.error(`❌ Failed to delete Local Storage:`, e.message);
        }
    }
});

if (!found) {
    console.log('⚠️  No local database found in standard locations.');
    console.log('   Locations checked:');
    candidates.forEach(c => console.log(`   - ${c}`));
} else {
    console.log('\n✨ Database reset complete. Restart the POS to re-sync from fresh.');
}
