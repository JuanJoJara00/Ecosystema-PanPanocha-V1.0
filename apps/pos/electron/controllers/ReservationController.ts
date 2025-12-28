
import { eq, and, lt } from 'drizzle-orm';
import { stockReservations } from '../db/schema';
import { sql } from 'drizzle-orm';

export class ReservationController {
    constructor(private db: any) { }

    async add(productId: string, quantity: number, sourceType: string, sourceId: string) {
        await this.db.insert(stockReservations).values({
            id: crypto.randomUUID(),
            product_id: productId,
            quantity,
            source_type: sourceType,
            source_id: sourceId,
            status: 'pending',
            created_at: new Date().toISOString()
        });
    }

    async addMany(items: { productId: string; quantity: number }[], sourceType: string, sourceId: string) {
        if (!items.length) return;
        await this.db.transaction(async (tx: any) => {
            for (const item of items) {
                await tx.insert(stockReservations).values({
                    id: crypto.randomUUID(),
                    product_id: item.productId,
                    quantity: item.quantity,
                    source_type: sourceType,
                    source_id: sourceId,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });
            }
        });
    }

    async removeBySource(sourceType: string, sourceId: string) {
        await this.db.delete(stockReservations)
            .where(and(
                eq(stockReservations.source_type, sourceType),
                eq(stockReservations.source_id, sourceId)
            ));
    }

    async getAllReserved() {
        return this.db.select().from(stockReservations).where(eq(stockReservations.status, 'pending'));
    }

    async cleanupExpiredPending(olderThanMinutes: number) {
        // SQLite datetime comparison
        const cutoff = new Date(Date.now() - olderThanMinutes * 60000).toISOString();
        const result = await this.db.delete(stockReservations)
            .where(and(
                eq(stockReservations.status, 'pending'),
                lt(stockReservations.created_at, cutoff)
            )).run();
        return result;
    }

    async clearAll() {
        await this.db.delete(stockReservations);
    }

    async markConfirmed(sourceType: string, sourceId: string) {
        await this.db.update(stockReservations)
            .set({ status: 'confirmed' })
            .where(and(
                eq(stockReservations.source_type, sourceType),
                eq(stockReservations.source_id, sourceId)
            ));
    }

    async clearConfirmed() {
        await this.db.delete(stockReservations).where(eq(stockReservations.status, 'confirmed'));
    }
}
