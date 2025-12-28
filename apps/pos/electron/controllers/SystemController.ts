
import { sql } from 'drizzle-orm';
import { sales, saleItems, orders, orderItems, expenses, deliveries, rappiDeliveries, shifts, stockReservations, clients } from '../db/schema';

export class SystemController {
    constructor(private db: any) { }

    async pruneOldData(daysToKeep = 30) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - daysToKeep);
        const isoLimit = dateLimit.toISOString();

        await this.db.transaction(async (tx: any) => {
            // 1. Delete old sales items (Cascade usually handles this if defined, but legacy didn't have cascade on all)
            // Drizzle schema has references, depends on DB implementation. 
            // Safest is to follow legacy manual delete order.

            // In proper SQL with FK CASCADE, deleting usage of parent deletes child.
            // But let's replicate logic for safety.

            // Delete Sales < Limit
            await tx.delete(sales).where(sql`${sales.created_at} < ${isoLimit}`);
            // Delete Orders < Limit
            await tx.delete(orders).where(sql`${orders.created_at} < ${isoLimit}`);
            // Delete Expenses < Limit
            await tx.delete(expenses).where(sql`${expenses.created_at} < ${isoLimit}`);
            // Delete Deliveries
            await tx.delete(deliveries).where(sql`${deliveries.created_at} < ${isoLimit}`);
            await tx.delete(rappiDeliveries).where(sql`${rappiDeliveries.created_at} < ${isoLimit}`);
        });

        return { success: true };
    }

    async resetSalesData() {
        await this.db.transaction(async (tx: any) => {
            await tx.delete(saleItems);
            await tx.delete(sales);
            await tx.delete(expenses);
            await tx.delete(orders);
            await tx.delete(orderItems);
            await tx.delete(shifts);
            await tx.delete(stockReservations);
            await tx.delete(clients);
            await tx.delete(deliveries);
            await tx.delete(rappiDeliveries);
        });
        return { success: true };
    }
}
