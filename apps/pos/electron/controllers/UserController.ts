
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';

export class UserController {
    constructor(private db: any) { }

    async getAll() {
        return this.db.select().from(users);
    }

    async get(id: string) {
        return this.db.select().from(users).where(eq(users.id, id)).get();
    }

    async upsertMany(items: any[]) {
        if (!items.length) return;
        await this.db.transaction(async (tx: any) => {
            for (const item of items) {
                await tx.insert(users).values(item)
                    .onConflictDoUpdate({ target: users.id, set: item });
            }
        });
    }
}
