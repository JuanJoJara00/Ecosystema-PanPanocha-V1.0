
import { eq, desc } from 'drizzle-orm';
import { deliveries, rappiDeliveries } from '../db/schema';

export class DeliveryController {
    constructor(private db: any) { }

    // --- Standard Deliveries ---
    async getAll() {
        return this.db.select().from(deliveries).orderBy(desc(deliveries.created_at)).limit(100);
    }

    async getByBranch(branchId: string) {
        return this.db.select().from(deliveries)
            .where(eq(deliveries.branch_id, branchId))
            .orderBy(desc(deliveries.created_at))
            .limit(100);
    }

    async create(delivery: any) {
        await this.db.insert(deliveries).values({
            ...delivery,
            created_at: delivery.created_at || new Date().toISOString(),
            synced: false
        });
        return { success: true, id: delivery.id };
    }

    async updateStatus(id: string, status: string) {
        await this.db.update(deliveries).set({ status, synced: false }).where(eq(deliveries.id, id));
        return { success: true };
    }

    async getPending() {
        return this.db.select().from(deliveries).where(eq(deliveries.synced, false));
    }

    async markSynced(id: string) {
        await this.db.update(deliveries).set({ synced: true }).where(eq(deliveries.id, id));
    }

    async upsertMany(items: any[]) {
        if (!items.length) return;
        await this.db.transaction(async (tx: any) => {
            for (const item of items) {
                await tx.insert(deliveries).values(item)
                    .onConflictDoUpdate({ target: deliveries.id, set: item });
            }
        });
    }

    // --- Rappi Deliveries ---
    async getRappiAll() {
        return this.db.select().from(rappiDeliveries).orderBy(desc(rappiDeliveries.created_at)).limit(50);
    }

    async createRappi(delivery: any) {
        await this.db.insert(rappiDeliveries).values({
            ...delivery,
            created_at: delivery.created_at || new Date().toISOString(),
            synced: false
        });
        return { success: true, id: delivery.id };
    }

    async updateRappiStatus(id: string, status: string) {
        await this.db.update(rappiDeliveries).set({ status, synced: false }).where(eq(rappiDeliveries.id, id));
        return { success: true };
    }

    async getRappiPending() {
        return this.db.select().from(rappiDeliveries).where(eq(rappiDeliveries.synced, false));
    }

    async markRappiSynced(id: string) {
        await this.db.update(rappiDeliveries).set({ synced: true }).where(eq(rappiDeliveries.id, id));
    }
}
