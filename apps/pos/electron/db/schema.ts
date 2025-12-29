import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { Schema, Table, column } from '@powersync/node';
import { relations } from 'drizzle-orm';

// --- DRIZZLE TABLES (12 Table Parity) ---


// Helper for SaaS Identity Injection
const orgId = () => text('organization_id').notNull();

// 1. Core Commercial
export const products = sqliteTable('products', {
    id: text('id').primaryKey(),
    organization_id: orgId(), // SaaS Injection
    name: text('name').notNull(),
    description: text('description'),
    price: real('price').notNull(),
    cost_price: real('cost_price').default(0),
    sku: text('sku'),
    barcode: text('barcode'),
    tax_rate: real('tax_rate').default(0),
    category: text('category'),
    active: integer('active', { mode: 'boolean' }).default(true),
    stock: integer('stock').default(0),
    min_stock: integer('min_stock'),
    max_stock: integer('max_stock'),
    supplier_id: text('supplier_id'),
    image_url: text('image_url'),
    last_synced_at: text('last_synced_at'),
    deleted_at: text('deleted_at')
});

export const sales = sqliteTable('sales', {
    id: text('id').primaryKey(),
    organization_id: orgId(), // SaaS Injection
    branch_id: text('branch_id').notNull(),
    shift_id: text('shift_id'),
    total_amount: real('total_amount').notNull(),
    status: text('status').default('completed'),
    payment_method: text('payment_method').default('cash'),
    payment_data: text('payment_data'),
    tip_amount: real('tip_amount').default(0),
    discount_amount: real('discount_amount').default(0),
    discount_reason: text('discount_reason'),
    diners: integer('diners').default(1),
    created_at: text('created_at').notNull(),
    created_by: text('created_by'),
    sale_channel: text('sale_channel'),
    source_device_id: text('source_device_id'),
    created_by_system: text('created_by_system'),
    client_id: text('client_id'),
    synced: integer('synced', { mode: 'boolean' }).default(false)
});

export const orders = sqliteTable('orders', {
    id: text('id').primaryKey(),
    organization_id: orgId(), // SaaS Injection
    branch_id: text('branch_id'),
    sale_id: text('sale_id'),
    table_id: text('table_id'),
    shift_id: text('shift_id'),
    created_by: text('created_by'),
    total_amount: real('total_amount').default(0),
    status: text('status').default('pending'),
    customer_name: text('customer_name'),
    diners: integer('diners').default(1),
    cancellation_reason: text('cancellation_reason'),
    created_at: text('created_at'),
    synced: integer('synced', { mode: 'boolean' }).default(false)
});

export const orderItems = sqliteTable('order_items', {
    id: text('id').primaryKey(),
    organization_id: orgId(), // SaaS Injection
    order_id: text('order_id').notNull().references(() => orders.id),
    product_id: text('product_id').notNull().references(() => products.id),
    quantity: real('quantity').notNull(),
    unit_price: real('unit_price').notNull(),
    total_price: real('total_price').notNull(),
    notes: text('notes')
});

export const saleItems = sqliteTable('sale_items', {
    id: text('id').primaryKey(),
    organization_id: orgId(), // SaaS Injection
    sale_id: text('sale_id').notNull().references(() => sales.id),
    product_id: text('product_id').notNull().references(() => products.id),
    quantity: real('quantity').notNull(),
    unit_price: real('unit_price').notNull(),
    unit_cost: real('unit_cost').default(0),
    tax_amount: real('tax_amount').default(0),
    total_price: real('total_price').notNull()
});

export const clients = sqliteTable('clients', {
    id: text('id').primaryKey(),
    organization_id: orgId(), // SaaS Injection
    full_name: text('full_name').notNull(),
    document_id: text('document_id'),
    phone: text('phone'),
    email: text('email'),
    points: integer('points').default(0),
    last_visit: text('last_visit'),
    preferences: text('preferences'),
    created_at: text('created_at'),
    updated_at: text('updated_at'),
    synced: integer('synced', { mode: 'boolean' }).default(false),
    deleted_at: text('deleted_at')
});

// 2. Shift Management
export const shifts = sqliteTable('shifts', {
    id: text('id').primaryKey(),
    organization_id: orgId(), // SaaS Injection
    branch_id: text('branch_id').notNull(),
    user_id: text('user_id').notNull(),
    start_time: text('start_time').notNull(),
    end_time: text('end_time'),
    initial_cash: real('initial_cash').default(0),
    final_cash: real('final_cash'),
    expected_cash: real('expected_cash'),
    status: text('status').default('open'),
    turn_type: text('turn_type'),
    closing_metadata: text('closing_metadata'),
    notes: text('notes'),
    pending_tips: real('pending_tips').default(0),
    synced: integer('synced', { mode: 'boolean' }).default(false),
    deleted_at: text('deleted_at')
});

export const expenses = sqliteTable('expenses', {
    id: text('id').primaryKey(),
    organization_id: orgId(), // SaaS Injection
    branch_id: text('branch_id').notNull(),
    shift_id: text('shift_id').references(() => shifts.id, { onDelete: 'cascade' }),
    user_id: text('user_id').notNull(),
    description: text('description').notNull(),
    amount: real('amount').notNull(),
    category: text('category').default('general'),
    voucher_number: text('voucher_number'),
    authorize_user_id: text('authorize_user_id'),
    created_at: text('created_at'),
    synced: integer('synced', { mode: 'boolean' }).default(false)
});

// "tips" in User Request -> "tip_distributions" in Legacy DB
export const tipDistributions = sqliteTable('tip_distributions', {
    id: text('id').primaryKey(),
    organization_id: orgId(), // SaaS Injection
    shift_id: text('shift_id').notNull().references(() => shifts.id),
    employee_id: text('employee_id').notNull(),
    employee_name: text('employee_name'),
    amount: real('amount').notNull(),
    created_at: text('created_at'),
    synced: integer('synced', { mode: 'boolean' }).default(false)
});

// 3. Logistics & Delivery
export const deliveries = sqliteTable('deliveries', {
    id: text('id').primaryKey(),
    organization_id: orgId(), // SaaS Injection
    branch_id: text('branch_id').notNull(),
    customer_name: text('customer_name').notNull(),
    customer_phone: text('customer_phone'),
    customer_address: text('customer_address').notNull(),
    product_details: text('product_details'),
    delivery_fee: real('delivery_fee').default(0),
    status: text('status').default('pending'),
    assigned_driver: text('assigned_driver'),
    created_at: text('created_at'),
    synced: integer('synced', { mode: 'boolean' }).default(false)
});

export const rappiDeliveries = sqliteTable('rappi_deliveries', {
    id: text('id').primaryKey(),
    organization_id: orgId(), // SaaS Injection
    rappi_order_id: text('rappi_order_id').notNull(),
    branch_id: text('branch_id'),
    product_details: text('product_details'),
    total_value: real('total_value').notNull(),
    status: text('status').default('pending'),
    delivery_code: text('delivery_code'),
    notes: text('notes'),
    created_at: text('created_at'),
    synced: integer('synced', { mode: 'boolean' }).default(false)
});

// 4. Floor & Inventory
export const tables = sqliteTable('tables', {
    id: text('id').primaryKey(),
    organization_id: orgId(), // SaaS Injection
    branch_id: text('branch_id').notNull(),
    name: text('name').notNull(),
    status: text('status').default('available'),
    created_at: text('created_at'),
    updated_at: text('updated_at')
});

export const stockReservations = sqliteTable('stock_reservations', {
    id: text('id').primaryKey(),
    organization_id: orgId(), // SaaS Injection
    product_id: text('product_id').notNull().references(() => products.id),
    quantity: real('quantity').notNull(),
    source_type: text('source_type').notNull(),
    source_id: text('source_id').notNull(),
    status: text('status').default('pending'),
    created_at: text('created_at')
});

// Users & Branches (Core)
export const users = sqliteTable('users', {
    id: text('id').primaryKey(),
    organization_id: orgId(), // SaaS Injection
    email: text('email'),
    full_name: text('full_name'),
    role: text('role'),
    deleted_at: text('deleted_at')
});

export const branches = sqliteTable('branches', {
    id: text('id').primaryKey(),
    organization_id: orgId(), // SaaS Injection
    name: text('name').notNull(),
    city: text('city'),
    address: text('address'),
    nit: text('nit'),
    phone: text('phone'),
    deleted_at: text('deleted_at')
});


// --- RELATIONS ---
export const salesRelations = relations(sales, ({ many, one }) => ({
    items: many(saleItems),
    shift: one(shifts, { fields: [sales.shift_id], references: [shifts.id] })
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
    sale: one(sales, { fields: [saleItems.sale_id], references: [sales.id] }),
    product: one(products, { fields: [saleItems.product_id], references: [products.id] }),
}));

export const ordersRelations = relations(orders, ({ many, one }) => ({
    items: many(orderItems),
    table: one(tables, { fields: [orders.table_id], references: [tables.id] }),
    shift: one(shifts, { fields: [orders.shift_id], references: [shifts.id] })
}));

export const shiftsRelations = relations(shifts, ({ many, one }) => ({
    expenses: many(expenses),
    sales: many(sales),
    tips: many(tipDistributions),
    user: one(users, { fields: [shifts.user_id], references: [users.id] }),
    branch: one(branches, { fields: [shifts.branch_id], references: [branches.id] })
}));

// --- POWERSYNC SCHEMA (For Sync Rules) ---

console.log('DEBUG: Initializing AppSchema');
console.log('DEBUG: Table constructor:', Table);
console.log('DEBUG: Schema constructor:', Schema);

try {
    const t = new Table({ test: column.text });
    console.log('DEBUG: Test Table instance:', t);
    console.log('DEBUG: Test Table proto:', Object.getPrototypeOf(t));
    console.log('DEBUG: copyWithName type:', typeof t.copyWithName);
} catch (e) {
    console.error('DEBUG: Test Table creation failed:', e);
}

export const AppSchema = new Schema({
    products: new Table({
        organization_id: column.text,
        name: column.text,
        price: column.real,
        stock: column.integer,
        active: column.integer
    }),
    branches: new Table({
        organization_id: column.text,
        name: column.text
    }),
    orders: new Table({
        organization_id: column.text,
        total_amount: column.real,
        status: column.text,
        created_at: column.text
    }),
    order_items: new Table({
        organization_id: column.text,
        order_id: column.text,
        product_id: column.text,
        quantity: column.real,
        total_price: column.real
    }),
    sales: new Table({
        organization_id: column.text,
        total_amount: column.real,
        status: column.text,
        created_at: column.text
    }),
    sale_items: new Table({
        organization_id: column.text,
        sale_id: column.text,
        product_id: column.text,
        quantity: column.real,
        total_price: column.real
    }),
    shifts: new Table({
        organization_id: column.text,
        user_id: column.text,
        start_time: column.text,
        status: column.text
    }),
    expenses: new Table({
        organization_id: column.text,
        amount: column.real,
        description: column.text
    }),
    clients: new Table({
        organization_id: column.text,
        full_name: column.text,
        points: column.integer
    })
});

// Export unified object
export const schema = {
    products,
    users,
    branches,
    orders,
    orderItems,
    sales,
    saleItems,
    clients,
    shifts,
    expenses,
    tipDistributions,
    deliveries,
    rappiDeliveries,
    tables,
    stockReservations,
    // Relations
    salesRelations,
    saleItemsRelations,
    ordersRelations,
    shiftsRelations
};
