
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq, like, count, and, sql } from 'drizzle-orm';
import { products } from '../db/schema';
import { Product } from '@panpanocha/types';
import { z } from 'zod';

const paginationSchema = z.object({
    skip: z.number().min(0).default(0),
    take: z.number().min(1).max(100).default(50),
    search: z.string().optional(),
    categoryId: z.string().optional()
});

export class InventoryController {
    constructor(private db: any) { }

    async getProducts(params: any) {
        const p = paginationSchema.parse(params);

        const conditions = [];
        if (p.search) conditions.push(like(products.name, `%${p.search}%`));
        if (p.categoryId) conditions.push(eq(products.category_id, p.categoryId));

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const data = await this.db.select().from(products)
            .where(whereClause)
            .limit(p.take)
            .offset(p.skip);

        const totalResult = await this.db.select({ count: count() })
            .from(products)
            .where(whereClause);

        return {
            products: data,
            total: totalResult[0]?.count || 0
        };
    }

    async getCategories() {
        // Use standard select with groupBy to ensure compatibility and robustness
        const result = await this.db.select({
            category: products.category_id
        })
            .from(products)
            .where(
                and(
                    eq(products.active, true),
                    sql`${products.category_id} IS NOT NULL`
                )
            )
            .groupBy(products.category_id);

        return result.map((r: any) => r.category).filter(Boolean);
    }
}
