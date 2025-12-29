
import { eq, sql, desc } from 'drizzle-orm';
import { sales, saleItems, shifts, orders, orderItems, users } from '../db/schema';
import { Sale, SaleItem } from '@panpanocha/types';
import type { PosDatabase, NewSaleRecord, NewSaleItemRecord, SaleWithDetails } from '../db/types';

export class SalesController {
    constructor(private db: PosDatabase) { }

    async saveSale(sale: NewSaleRecord, items: NewSaleItemRecord[]) {
        // Validation: Check shift status if shift_id is present
        if (sale.shift_id && !sale.synced) {
            const shift = await this.db.query.shifts.findFirst({
                where: eq(shifts.id, sale.shift_id)
            });

            if (!shift || shift.status !== 'open') {
                throw new Error("Cannot register sale: Shift is closed or invalid.");
            }
        }

        // SaaS Identity Injection (Phase 2)
        // Ensure organization_id is present. If not (legacy frontend), resolve from user.
        if (!sale.organization_id) {
            console.warn('[SalesController] Missing organization_id in sale payload. Attempting resolution...');
            // Try to resolve from user (created_by)
            if (sale.created_by) {
                const user = await this.db.query.users.findFirst({
                    where: eq(users.id, sale.created_by),
                    columns: { organization_id: true }
                });
                if (user?.organization_id) {
                    // We must cast/mutate because NewSaleRecord definition says it's mandatory
                    // but runtime payload might lack it.
                    (sale as any).organization_id = user.organization_id;
                } else {
                    // Fallback to Legacy ID (assuming migration created it)
                    (sale as any).organization_id = '00000000-0000-0000-0000-000000000000';
                }
            } else {
                (sale as any).organization_id = '00000000-0000-0000-0000-000000000000';
            }
        }

        // Propagate Identity to Items
        const orgId = sale.organization_id;
        const itemsWithOrg = items.map(item => ({
            ...item,
            organization_id: item.organization_id || orgId
        }));

        await this.db.transaction(async (tx) => {
            // 1. Upsert Sale
            await tx.insert(sales).values(sale)
                .onConflictDoUpdate({
                    target: sales.id,
                    set: { synced: sale.synced }
                });

            // 2. Insert Items
            if (itemsWithOrg.length > 0) {
                await tx.insert(saleItems).values(itemsWithOrg)
                    .onConflictDoNothing();
            }
        });

        console.log(`[SalesController] Saved sale ${sale.id} with ${items.length} items for Org: ${orgId}`);
        return { success: true };
    }

    async getPendingSales(): Promise<SaleWithDetails[]> {
        return this.db.query.sales.findMany({
            where: (sales, { eq }) => eq(sales.synced, false),
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
            where: (sales, { eq }) => eq(sales.shift_id, shiftId),
            orderBy: (sales, { desc }) => [desc(sales.created_at)],
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
            where: (items, { eq }) => eq(items.sale_id, saleId),
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

        await this.db.transaction(async (tx) => {
            for (const entry of batch) {
                const s = entry.sale;
                // Cast to NewSaleRecord if coming from external source untyped
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
            orderBy: (sales, { desc }) => [desc(sales.created_at)],
            with: {
                items: {
                    with: { product: true }
                }
            }
        });
    }

    // --- Order Logic ---
    async getPendingOrder(tableId: string) {
        return this.db.query.orders.findFirst({
            where: (orders, { eq, and }) => and(eq(orders.table_id, tableId), eq(orders.status, 'pending')),
            orderBy: (orders, { desc }) => [desc(orders.created_at)],
            with: {
                items: {
                    with: { product: true }
                }
            }
        });
    }

    async getAllOrders() {
        return this.db.query.orders.findMany({
            where: (orders, { eq }) => eq(orders.status, 'pending'),
            with: {
                items: {
                    with: { product: true }
                }
            }
        });
    }

    async createOrder(order: any, items: any[]) {
        // SaaS Injection for Orders
        let orgId = order.organization_id;
        if (!orgId && order.created_by) {
            const user = await this.db.query.users.findFirst({
                where: eq(users.id, order.created_by),
                columns: { organization_id: true }
            });
            orgId = user?.organization_id || '00000000-0000-0000-0000-000000000000';
        }

        const itemsWithOrg = items.map(item => ({
            ...item,
            organization_id: item.organization_id || orgId
        }));

        await this.db.transaction(async (tx) => {
            // Upsert/Insert logic for Orders - Keeping any for input here as refactoring OrderDAO fully wasn't main scope,
            // but using tx from typed DB helps.
            await tx.insert(orders).values({
                id: order.id,
                organization_id: orgId || '00000000-0000-0000-0000-000000000000',
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
            for (const item of itemsWithOrg) {
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
            where: (oi, { eq }) => eq(oi.order_id, orderId),
            with: { product: true }
        });
    }

    async deleteOrder(orderId: string) {
        await this.db.transaction(async (tx) => {
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
