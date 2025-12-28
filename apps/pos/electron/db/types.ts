import { wrapPowerSyncWithDrizzle } from '@powersync/drizzle-driver';
import { schema, sales, saleItems, products } from './schema';
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

// Infer the database type based on the schema and the wrapper function
export type PosDatabase = ReturnType<typeof wrapPowerSyncWithDrizzle<typeof schema>>;

// --- Sale Types ---
export type SaleRecord = InferSelectModel<typeof sales>;
export type NewSaleRecord = InferInsertModel<typeof sales>;

export type SaleItemRecord = InferSelectModel<typeof saleItems>;
export type NewSaleItemRecord = InferInsertModel<typeof saleItems>;

// --- Product Types ---
export type ProductRecord = InferSelectModel<typeof products>;

// --- Composite Types ---
export type SaleWithDetails = SaleRecord & {
    items: (SaleItemRecord & {
        product: ProductRecord
    })[];
};
