import { useEffect } from 'react';
import { usePosStore } from '../store';
import { supabase } from '../api/client';

export function useShiftMonitor() {
    const { currentShift, initialize, showAlert } = usePosStore();

    // 1. Heartbeat Loop (Updates Local DB -> Syncs to Server)
    useEffect(() => {
        if (!currentShift) return;

        const intervalId = setInterval(() => {
            console.log('[Heartbeat] Pinging...', currentShift.id);
            window.electron.updateShiftHeartbeat(currentShift.id).catch(err => {
                console.error('[Heartbeat] Failed:', err);
            });
        }, 60000); // Every 60 seconds

        // Initial ping
        window.electron.updateShiftHeartbeat(currentShift.id).catch(console.error);

        return () => clearInterval(intervalId);
    }, [currentShift?.id]); // Only restart if shift ID changes

    // 2. Remote Close Listener (Listens to Supabase Realtime)
    useEffect(() => {
        if (!currentShift) return;

        let channel: any = null;

        const subscribe = async () => {
            // Wait for session to be restored (store/index.ts initialize)
            const { data } = await supabase.auth.getSession();
            if (!data.session?.access_token) {
                console.log('[Monitor] No active session, skipping subscription.');
                return;
            }

            console.log('[Monitor] Subscribing to shift updates:', currentShift.id);

            channel = supabase
                .channel(`shift-monitor-${currentShift.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'shifts',
                        filter: `id=eq.${currentShift.id}`
                    },
                    (payload) => {
                        const newShift = payload.new as any;
                        console.log('[Monitor] Shift Update Received:', newShift);

                        if (newShift.status === 'closed' && newShift.closed_by_method === 'remote') {
                            console.warn('[Monitor] Shift closed remotely! Logging out...');
                            showAlert('warning', 'Turno Cerrado', 'Este turno ha sido cerrado remotamente desde el Portal.');
                            initialize();
                        }
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('[Monitor] Connected');
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('[Monitor] Connection Error');
                    }
                });
        };

        subscribe();

        return () => {
            if (channel) {
                console.log('[Monitor] Unsubscribing...');
                supabase.removeChannel(channel);
            }
        };
    }, [currentShift?.id, initialize, showAlert]);
}
