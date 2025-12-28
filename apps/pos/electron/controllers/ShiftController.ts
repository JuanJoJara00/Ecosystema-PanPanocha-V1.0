
import { eq, desc, sql } from 'drizzle-orm';
import { shifts, expenses, tipDistributions, sales, saleItems, products } from '../db/schema';
import { Shift, Expense, TipDistribution } from '@panpanocha/types';

export class ShiftController {
    constructor(private db: any) { }

    async openShift(shift: Shift) {
        // Reuse logic: check open shift
        const existing = await this.db.select().from(shifts)
            .where(sql`${shifts.user_id} = ${shift.user_id} AND ${shifts.branch_id} = ${shift.branch_id} AND ${shifts.status} = 'open'`)
            .get();

        if (existing) {
            console.log('[ShiftTheController] Found existing open shift, reusing:', existing);
            return { status: 'exists', shift: existing };
        }

        await this.db.insert(shifts).values({
            id: shift.id,
            branch_id: shift.branch_id,
            user_id: shift.user_id,
            start_time: shift.start_time,
            initial_cash: shift.initial_cash || 0,
            status: 'open',
            turn_type: shift.turn_type || 'morning',
            synced: false
        });

        return { status: 'created', shift };
    }

    async closeShift(data: { id: string, endTime: string, finalCash: number, expectedCash: number }) {
        await this.db.update(shifts)
            .set({
                end_time: data.endTime,
                final_cash: data.finalCash,
                expected_cash: data.expectedCash,
                status: 'closed'
            })
            .where(eq(shifts.id, data.id));
    }

    async getShift() { // getCurrent
        return this.db.select().from(shifts)
            .where(eq(shifts.status, 'open'))
            .orderBy(desc(shifts.start_time))
            .limit(1)
            .get();
    }

    async getSummary(shiftId: string) {
        // Sales Stats
        const salesStats = await this.db.select({
            salesCount: count(sales.id),
            totalSales: sql<number>`coalesce(sum(${sales.total_amount}), 0)`,
            totalTips: sql<number>`coalesce(sum(${sales.tip_amount}), 0)`,
            cashSales: sql<number>`coalesce(sum(case when ${sales.payment_method} = 'cash' then ${sales.total_amount} else 0 end), 0)`,
            cardSales: sql<number>`coalesce(sum(case when ${sales.payment_method} = 'card' then ${sales.total_amount} else 0 end), 0)`,
            transferSales: sql<number>`coalesce(sum(case when ${sales.payment_method} = 'transfer' then ${sales.total_amount} else 0 end), 0)`
        }).from(sales).where(eq(sales.shift_id, shiftId)).get();

        // Expenses
        const expenseStats = await this.db.select({
            totalExpenses: sql<number>`coalesce(sum(${expenses.amount}), 0)`
        }).from(expenses).where(eq(expenses.shift_id, shiftId)).get();

        // Products Sold
        const productsSold = await this.db.select({
            name: products.name,
            quantity: sql<number>`sum(${saleItems.quantity})`,
            total: sql<number>`sum(${saleItems.total_price})`
        })
            .from(saleItems)
            .innerJoin(sales, eq(saleItems.sale_id, sales.id))
            .innerJoin(products, eq(saleItems.product_id, products.id))
            .where(eq(sales.shift_id, shiftId))
            .groupBy(products.name)
            .all();

        return {
            totalSales: salesStats?.totalSales || 0,
            cashSales: salesStats?.cashSales || 0,
            cardSales: salesStats?.cardSales || 0,
            transferSales: salesStats?.transferSales || 0,
            totalTips: salesStats?.totalTips || 0,
            totalExpenses: expenseStats?.totalExpenses || 0,
            productsSold,
            salesCount: salesStats?.salesCount || 0
        };
    }

    // --- Expenses ---
    async createExpense(expense: Expense) {
        // Insert
        await this.db.insert(expenses).values({
            id: expense.id,
            branch_id: expense.branch_id,
            shift_id: expense.shift_id || null,
            user_id: expense.user_id,
            description: expense.description,
            amount: expense.amount,
            category: expense.category || 'general',
            voucher_number: expense.voucher_number || null,
            created_at: expense.created_at || new Date().toISOString(),
            synced: false
        });
        return { changes: 1 };
    }

    async getAllExpenses() {
        return this.db.select().from(expenses).orderBy(desc(expenses.created_at)).limit(100);
    }

    async deleteExpense(id: string) {
        await this.db.delete(expenses).where(eq(expenses.id, id));
    }

    async upsertExpenses(items: any[]) {
        if (!items.length) return;
        await this.db.transaction(async (tx: any) => {
            for (const item of items) {
                await tx.insert(expenses).values(item)
                    .onConflictDoUpdate({ target: expenses.id, set: item });
            }
        });
    }

    async getPendingExpenses() {
        return this.db.select().from(expenses).where(eq(expenses.synced, false));
    }

    async markExpenseSynced(id: string) {
        await this.db.update(expenses).set({ synced: true }).where(eq(expenses.id, id));
    }

    // --- Tips ---

    async createTipDistribution(item: TipDistribution) {
        await this.createTipDistributions([item]);
    }

    async createTipDistributions(items: TipDistribution[]) {
        await this.db.transaction(async (tx: any) => {
            for (const item of items) {
                await tx.insert(tipDistributions).values({
                    id: item.id,
                    shift_id: item.shift_id,
                    employee_id: item.employee_id,
                    employee_name: item.employee_name || '',
                    amount: item.amount,
                    created_at: item.created_at || new Date().toISOString(),
                    synced: false
                });
            }
        });
    }

    async getTipDistributionsByEmployee(employeeId: string) {
        return this.db.select().from(tipDistributions).where(eq(tipDistributions.employee_id, employeeId));
    }

    async getEmployeeTipsTotal(employeeId: string) {
        const result = await this.db.select({ total: sql<number>`sum(${tipDistributions.amount})` })
            .from(tipDistributions)
            .where(eq(tipDistributions.employee_id, employeeId));
        return result[0]?.total || 0;
    }

    async getPendingTipDistributions() {
        return this.db.select().from(tipDistributions).where(eq(tipDistributions.synced, false));
    }

    async markTipDistributionSynced(id: string) {
        await this.db.update(tipDistributions).set({ synced: true }).where(eq(tipDistributions.id, id));
    }

    async upsertTipDistributions(items: any[]) {
        if (!items.length) return;
        await this.db.transaction(async (tx: any) => {
            for (const item of items) {
                await tx.insert(tipDistributions).values(item)
                    .onConflictDoUpdate({ target: tipDistributions.id, set: item });
            }
        });
    }

    // --- Shift Operations (Legacy/Migrated) ---
    async getPendingShifts() {
        return this.db.select().from(shifts).where(eq(shifts.synced, false));
    }

    async markSynced(id: string) {
        await this.db.update(shifts).set({ synced: true }).where(eq(shifts.id, id));
    }

    async getAllShifts(limit: number = 100) {
        return this.db.select().from(shifts).orderBy(desc(shifts.start_time)).limit(limit);
    }

    async updateShiftData(id: string, data: Partial<Shift>) {
        await this.db.update(shifts).set(data).where(eq(shifts.id, id));
    }
}

// Helper for count
import { count } from 'drizzle-orm';
