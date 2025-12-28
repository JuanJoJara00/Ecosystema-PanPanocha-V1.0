import { useSyncStatus } from '../../hooks/useSyncStatus';
import { LucideWifi, LucideWifiOff, LucideRefreshCw } from 'lucide-react';

export const SyncStatus = () => {
    const status = useSyncStatus();

    let icon = <LucideWifiOff className="w-5 h-5 text-gray-400" />;
    let text = "Offline";
    let color = "bg-gray-100 text-gray-500 border-gray-200";

    if (status.connected) {
        if (status.downloading || status.uploading) {
            icon = <LucideRefreshCw className="w-5 h-5 animate-spin text-blue-500" />;
            text = "Sincronizando...";
            color = "bg-blue-50 text-blue-700 border-blue-200";
        } else {
            icon = <LucideWifi className="w-5 h-5 text-green-500" />;
            text = "Online";
            color = "bg-green-50 text-green-700 border-green-200";
        }
    } else if (status.connecting) {
        icon = <LucideRefreshCw className="w-5 h-5 animate-spin text-yellow-500" />;
        text = "Conectando...";
        color = "bg-yellow-50 text-yellow-700 border-yellow-200";
    }

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-b-2 text-sm font-medium transition-colors ${color}`} title={status.lastSyncedAt ? `Última sinc: ${status.lastSyncedAt.toLocaleTimeString()}` : 'Nunca sincronizado'}>
            {icon}
            <span className="hidden sm:inline">{text}</span>
        </div>
    );
};
