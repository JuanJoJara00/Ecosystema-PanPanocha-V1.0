
import { eq, like, or, desc, sql } from 'drizzle-orm';
import { clients } from '../db/schema';
import { Client } from '@panpanocha/types';

export class ClientController {
    constructor(private db: any) { }

    async search(query: string) {
        if (!query) return [];
        const search = `%${query}%`;
        return this.db.select().from(clients)
            .where(or(
                like(clients.full_name, search),
                like(clients.phone, search),
                like(clients.document_id, search)
            ))
            .limit(20);
    }

    async create(client: Client) {
        // Upsert based on ID
        const existing = await this.db.select().from(clients).where(eq(clients.id, client.id)).get();
        if (existing) {
            await this.db.update(clients).set({
                ...client,
                synced: false
            }).where(eq(clients.id, client.id));
        } else {
            await this.db.insert(clients).values({
                ...client,
                created_at: client.created_at || new Date().toISOString(),
                synced: false
            });
        }
        return { success: true, id: client.id };
    }

    async getPending() {
        return this.db.select().from(clients).where(eq(clients.synced, false));
    }

    async markSynced(id: string) {
        return this.db.update(clients).set({ synced: true }).where(eq(clients.id, id));
    }

    async upsertMany(items: any[]) {
        if (!items.length) return;
        await this.db.transaction(async (tx: any) => {
            for (const item of items) {
                await tx.insert(clients).values(item)
                    .onConflictDoUpdate({ target: clients.id, set: item });
            }
        });
    }
}
