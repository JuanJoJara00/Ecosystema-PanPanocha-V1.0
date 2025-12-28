import { AbstractPowerSyncDatabase, UpdateType } from '@powersync/web';
import type { PowerSyncBackendConnector } from '@powersync/web';


export class SupabaseConnector implements PowerSyncBackendConnector {
    constructor(private powerSyncUrl: string, private token: string) { }

    async fetchCredentials() {
        console.log('[SupabaseConnector] Fetching credentials...');
        // For development, we use a static token. 
        // In production, this would fetch a temporary token from our Supabase Backend (Edge Function).
        return {
            endpoint: this.powerSyncUrl,
            token: this.token
        };
    }

    async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
        // Fetch the next batch of transactions
        const transaction = await database.getNextCrudTransaction();

        if (!transaction) return;

        try {
            // Group operations
            for (const op of transaction.crud) {
                const table = op.table;
                const data = op.opData || {};
                const id = op.id;

                // Adjust the endpoint if necessary (e.g., enable RLS headers or use specific Supabase URL pattern)
                // Assuming `powerSyncUrl` is the PowerSync instance. We need the SUPABASE URL for data writes.
                // However, usually we can write back via PowerSync or direct to Supabase.
                // For simplicity in this Client-Side implementation, we'll assume we can write to Supabase directly
                // BUT we don't have Supabase URL/Key here, only PowerSync URL/Token.

                // CRITICAL SETUP CHECK:
                // To write to Supabase, we need a standard Supabase Client or fetch to Supabase REST API.
                // The provided 'token' is likely a Supabase JWT which is valid for Supabase REST API.
                // We need the Supabase Project URL.
                // Let's assume it's stored in env or we can infer it/inject it.
                // For now, let's use a placeholder and rely on `window.electron` if available, OR
                // since this is a React app, we might have `@supabase/supabase-js`.

                // However, to keep it loosely coupled as requested, let's use `fetch` to Supabase REST.
                // We need VITE_SUPABASE_URL from env.

                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY; // Or rely on the user token if authenticated

                if (!supabaseUrl) {
                    throw new Error("Missing VITE_SUPABASE_URL for upload");
                }

                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`,  // Use the authenticated user token
                    'apikey': supabaseKey
                };

                let method = 'POST';
                let body: any = data;
                let url = `${supabaseUrl}/rest/v1/${table}`;

                if (op.op === 'PUT') {
                    // Upsert (or Update if ID exists)
                    // If UUIDv7, we effectively treat PUT as UPSERT
                    method = 'POST';
                    headers['Prefer'] = 'resolution=merge-duplicates'; // Supabase Upsert
                } else if (op.op === 'PATCH') {
                    method = 'PATCH';
                    url += `?id=eq.${id}`;
                } else if (op.op === 'DELETE') {
                    method = 'DELETE';
                    url += `?id=eq.${id}`;
                    body = undefined;
                }

                const response = await fetch(url, {
                    method,
                    headers,
                    body: body ? JSON.stringify(body) : undefined
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Upload Failed [${table} ${op.op}]: ${response.status} - ${errText}`);
                }
            }

            // If all operations successful, mark transaction as complete
            await transaction.complete();

        } catch (e) {
            console.error('[SupabaseConnector] Upload Error:', e);
            // Do not complete transaction, so it retries later
        }
    }
}
