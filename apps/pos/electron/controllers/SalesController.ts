
import { eq, sql } from 'drizzle-orm';
import { sales, saleItems, shifts, orders, orderItems, products } from '../db/schema';
import { Sale, SaleItem } from '@panpanocha/types';

export class SalesController {
    constructor(private db: any) { }

    async saveSale(sale: Sale, items: SaleItem[]) {
        // Validation: Check shift status if shift_id is present
        if (sale.shift_id && !sale.synced) {
            const shift = await this.db.select().from(shifts).where(eq(shifts.id, sale.shift_id)).get();
            if (!shift || shift.status !== 'open') {
                throw new Error("Cannot register sale: Shift is closed or invalid.");
            }
        }

        await this.db.transaction(async (tx: any) => {
            await tx.insert(sales).values({
                id: sale.id,
                branch_id: sale.branch_id,
                shift_id: sale.shift_id || null,
                created_by: sale.created_by,
                total_amount: sale.total_amount,
                payment_method: sale.payment_method,
                status: sale.status,
                tip_amount: sale.tip_amount || 0,
                discount_amount: sale.discount_amount || 0,
                created_at: sale.created_at,
                synced: !!sale.synced,
                diners: sale.diners || 1,
                sale_channel: sale.sale_channel as any || null,
                created_by_system: sale.created_by_system || null,
                client_id: sale.client_id || null
            }).onConflictDoUpdate({ target: sales.id, set: { synced: !!sale.synced } }); // Simple Upsert logic

            for (const item of items) {
                await tx.insert(saleItems).values({
                    id: item.id,
                    sale_id: item.sale_id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.total_price
                }).onConflictDoNothing();
            }
        });

        console.log(`[SalesController] Saved sale ${sale.id} with ${items.length} items.`);
        return { success: true };
    }

    async getPendingSales() {
        return this.db.query.sales.findMany({
            where: (sales: any, { eq }: any) => eq(sales.synced, false),
            with: {
                items: {
                    with: {
                        product: true
                    }
                }
            }
        });
    }

    async getByShift(shiftId: string) {
        return this.db.query.sales.findMany({
            where: (sales: any, { eq }: any) => eq(sales.shift_id, shiftId),
            orderBy: (sales: any, { desc }: any) => [desc(sales.created_at)],
            with: {
                items: {
                    with: {
                        product: true
                    }
                }
            }
        });
    }

    // --- Analytics ---
    async getProductTrends(days: number) {
        return this.db.all(sql`
            SELECT p.name, COALESCE(SUM(si.quantity), 0) as quantity, COALESCE(SUM(si.total_price), 0) as total
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            WHERE datetime(s.created_at) >= datetime('now', '-' || ${days} || ' days')
            GROUP BY p.name
        `);
    }

    async getProductTrendsByRange(start: string, end: string) {
        return this.db.all(sql`
            SELECT p.name, COALESCE(SUM(si.quantity), 0) as quantity, COALESCE(SUM(si.total_price), 0) as total
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            WHERE datetime(s.created_at) >= datetime(${start}) AND datetime(s.created_at) <= datetime(${end})
            GROUP BY p.name
        `);
    }

    async getProductDailyTrends(days: number) {
        return this.db.all(sql`
            SELECT p.name, strftime('%Y-%m-%d', datetime(s.created_at)) as day, COALESCE(SUM(si.quantity), 0) as quantity
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            WHERE datetime(s.created_at) >= datetime('now', '-' || ${days} || ' days')
            GROUP BY p.name, day
            ORDER BY p.name, day
        `);
    }

    async getSaleItems(saleId: string) {
        return this.db.query.saleItems.findMany({
            where: (items: any, { eq }: any) => eq(items.sale_id, saleId),
            with: { product: true }
        });
    }

    async markSynced(saleId: string) {
        await this.db.update(sales).set({ synced: true }).where(eq(sales.id, saleId));
    }

    async updateShift(saleId: string, shiftId: string) {
        await this.db.update(sales).set({ shift_id: shiftId }).where(eq(sales.id, saleId));
    }

    async importBatch(batch: any[]) {
        if (!batch.length) return;

        await this.db.transaction(async (tx: any) => {
            for (const entry of batch) {
                const s = entry.sale;
                await tx.insert(sales).values({
                    ...s,
                    shift_id: s.shift_id || null,
                    synced: true
                }).onConflictDoNothing();

                if (entry.items) {
                    for (const item of entry.items) {
                        await tx.insert(saleItems).values(item).onConflictDoNothing();
                    }
                }
            }
        });
    }

    async getAll() {
        return this.db.query.sales.findMany({
            orderBy: (sales: any, { desc }: any) => [desc(sales.created_at)],
            with: {
                items: {
                    with: { product: true }
                }
            }
        });
    }

    // --- Order Logic (Migrated from OrderDAO) ---
    async getPendingOrder(tableId: string) {
        return this.db.query.orders.findFirst({
            where: (orders: any, { eq, and }: any) => and(eq(orders.table_id, tableId), eq(orders.status, 'pending')),
            orderBy: (orders: any, { desc }: any) => [desc(orders.created_at)],
            with: {
                items: {
                    with: { product: true }
                }
            }
        });
    }

    async getAllOrders() {
        return this.db.query.orders.findMany({
            where: (orders: any, { eq }: any) => eq(orders.status, 'pending'),
            with: {
                items: {
                    with: { product: true }
                }
            }
        });
    }

    async createOrder(order: any, items: any[]) {
        await this.db.transaction(async (tx: any) => {
            await tx.insert(orders).values({
                id: order.id,
                branch_id: order.branch_id,
                shift_id: order.shift_id || null,
                table_id: order.table_id || null,
                created_by: order.created_by,
                customer_name: order.customer_name || 'Cliente General',
                status: order.status || 'pending',
                total_amount: order.total_amount || 0,
                diners: order.diners || 1,
                created_at: order.created_at || new Date().toISOString(),
                synced: !!order.synced
            });
            for (const item of items) {
                await tx.insert(orderItems).values(item);
            }
        });
    }

    async updateOrderDiners(orderId: string, diners: number) {
        await this.db.update(orders).set({ diners }).where(eq(orders.id, orderId));
    }

    async updateOrderTable(orderId: string, tableId: string) {
        await this.db.update(orders).set({ table_id: tableId }).where(eq(orders.id, orderId));
    }

    async getOrderItems(orderId: string) {
        return this.db.query.orderItems.findMany({
            where: (oi: any, { eq }: any) => eq(oi.order_id, orderId),
            with: { product: true }
        });
    }

    async deleteOrder(orderId: string) {
        await this.db.transaction(async (tx: any) => {
            await tx.delete(orderItems).where(eq(orderItems.order_id, orderId));
            await tx.delete(orders).where(eq(orders.id, orderId));
        });
    }

    async addItemToOrder(item: any) {
        await this.db.insert(orderItems).values(item);
    }

    async deleteItemFromOrder(itemId: string) {
        await this.db.delete(orderItems).where(eq(orderItems.id, itemId));
    }

    async updateOrderItem(itemId: string, quantity: number, totalPrice: number) {
        await this.db.update(orderItems).set({ quantity, total_price: totalPrice }).where(eq(orderItems.id, itemId));
    }

    async completeOrder(orderId: string) {
        await this.db.update(orders).set({ status: 'completed' }).where(eq(orders.id, orderId));
    }

}
