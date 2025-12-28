
import { eq } from 'drizzle-orm';
import { branches } from '../db/schema';

export class BranchController {
    constructor(private db: any) { }

    async getAll() {
        return this.db.select().from(branches); // Simple list
    }

    async get(id: string) {
        return this.db.select().from(branches).where(eq(branches.id, id)).get();
    }

    async upsertMany(items: any[]) {
        if (!items.length) return;
        await this.db.transaction(async (tx: any) => {
            for (const item of items) {
                await tx.insert(branches).values(item)
                    .onConflictDoUpdate({ target: branches.id, set: item });
            }
        });
    }
}
