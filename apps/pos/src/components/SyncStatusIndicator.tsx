import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useSyncStatus } from '../hooks/useSyncStatus';

export const SyncStatusIndicator = () => {
    const status = useSyncStatus();

    // Derive simple states
    const syncing = status.downloading || status.uploading || status.connecting;
    const connected = status.connected;
    const lastSyncedAt = status.lastSyncedAt;

    if (syncing) {
        return (
            <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full text-xs font-medium animate-pulse border border-yellow-200">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Sincronizando...</span>
            </div>
        );
    }

    if (!connected) {
        return (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full text-xs font-medium border border-red-200">
                <CloudOff className="w-3 h-3" />
                <span>Offline (Local)</span>
            </div>
        );
    }

    return (
        <div
            className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-medium border border-green-200 tooltip cursor-help"
            title={`Última sinc: ${lastSyncedAt?.toLocaleTimeString() || 'Reciente'}`}
        >
            <Cloud className="w-3 h-3" />
            <span>En Línea</span>
        </div>
    );
};
