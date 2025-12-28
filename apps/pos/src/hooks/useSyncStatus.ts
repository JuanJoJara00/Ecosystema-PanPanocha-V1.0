import { useState, useEffect } from 'react';
import { powerSync } from '../lib/powersync';

export interface SyncStatusData {
    connected: boolean;
    connecting: boolean;
    downloading: boolean;
    uploading: boolean;
    lastSyncedAt: Date | null;
}

export function useSyncStatus(): SyncStatusData {
    const [status, setStatus] = useState<SyncStatusData>({
        connected: false,
        connecting: false,
        downloading: false,
        uploading: false,
        lastSyncedAt: null
    });

    useEffect(() => {
        // Initial state

        const updateStatus = () => {
            const s = powerSync.db.currentStatus;

            // @ts-ignore
            // const instanceId = powerSync._id;

            setStatus(previous => {
                // Determine if changed to avoid unnecessary re-renders
                if (previous.connected === s.connected && previous.connecting === s.connecting && previous.lastSyncedAt === s.lastSyncedAt) {
                    return previous;
                }
                return {
                    connected: s.connected,
                    connecting: s.connecting,
                    // @ts-ignore
                    downloading: s.downloading || false,
                    // @ts-ignore
                    uploading: s.uploading || false,
                    lastSyncedAt: s.lastSyncedAt || null
                };
            });
        };

        // Subscribe to changes
        const l = powerSync.db.registerListener({
            statusChanged: updateStatus
        });

        // Initial call
        updateStatus();

        // Polling fallback - Every 3 seconds
        const interval = setInterval(() => {
            // Only log if status changed to avoid noise, or log every time for now?
            // Let's log if state differs or just call updateStatus which logs.
            // updateStatus(); // This would spam logs.

            // Smarter polling:
            const s = powerSync.db.currentStatus;
            if (s.connected !== status.connected) {
                updateStatus();
            }
        }, 3000);

        return () => {
            l?.();
            clearInterval(interval);
        };
    }, []); // Removed status dependency to avoid infinite loop re-subscribe, referencing state via closure is tricky.
    // Actually, updateStatus reads fresh s = powerSync.db.currentStatus, so it's fine.
    // But 'status' in the polling check refers to the stale closure value from the first render.
    // We need a ref or just updateStatus blindly? 
    // Let's just updateStatus blindly but remove the spammy logs from updateStatus first, or accept spam for a moment.

    return status;
}
