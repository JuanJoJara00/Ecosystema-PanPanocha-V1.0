
import { eq } from 'drizzle-orm';
import { tables } from '../db/schema';
import { Table } from '@panpanocha/types';

export class TableController {
    constructor(private db: any) { }

    async getByBranch(branchId: string) {
        return this.db.select().from(tables).where(eq(tables.branch_id, branchId));
    }

    async create(table: Table) {
        await this.db.insert(tables).values({
            ...table,
            status: table.status || 'available'
        });
        return { success: true };
    }

    async update(id: string, data: Partial<Table>) {
        await this.db.update(tables).set(data).where(eq(tables.id, id));
        return { success: true };
    }

    async delete(id: string) {
        await this.db.delete(tables).where(eq(tables.id, id));
        return { success: true };
    }
}
