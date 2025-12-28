import { useEffect, useState } from 'react';

// Define a safe shape for the result to avoid 'any'
interface LiveQueryResult<T> {
    data: T | undefined;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export function useLiveQuery<T>(channel: string, args?: any): LiveQueryResult<T> {
    const [data, setData] = useState<T>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            // invoke is strictly typed in vite-env.d.ts? If not, we trust the bridge.
            const result = await window.electron.invoke(channel, args);
            setData(result);
        } catch (err: any) {
            console.error(`[useLiveQuery] Error on ${channel}:`, err);
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Reactivity: Listen for generic 'db-changed' event
        // Optimization: In real implementation, channel-specific events are better.
        // For Phase 2, we just refresh on any DB change.
        if (typeof window.electron.on === 'function') {
            const cleanup = window.electron.on('db-changed', () => {
                fetchData();
            });
            return () => {
                // If cleanup callback provided
                if (typeof cleanup === 'function') cleanup();
            };
        }
    }, [channel, JSON.stringify(args)]);

    return { data, loading, error, refetch: fetchData };
}
