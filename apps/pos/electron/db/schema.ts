import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { Schema, Table, column } from '@powersync/node';
import { relations } from 'drizzle-orm';

// --- DRIZZLE TABLES (12 Table Parity) ---


// Helper for SaaS Identity Injection
const orgId = () => text('organization_id').notNull();

// 1. Core Commercial
export const devices = sqliteTable('devices', {
    id: text('id').primaryKey(), // UUID synced from Cloud
    organization_id: text('organization_id').notNull(),
    branch_id: text('branch_id').notNull(),
    name: text('name').notNull(),

    // Status and Metadata
    status: text('status').default('active'), // 'pending' devices rarely sync, but good to have type parity
    type: text('type').default('pos_terminal'),
    fingerprint: text('fingerprint'), // Useful for local validation on startup

    // Versioning
    app_version: text('app_version'),

    // Timestamps
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at'),
    deleted_at: text('deleted_at')
});

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
    category_id: text('category_id'),
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

export const devicesRelations = relations(devices, ({ many }) => ({
    sales: many(sales),
    shifts: many(shifts)
}));

export const productsRelations = relations(products, ({ one }) => ({
    // No explicit relations needed yet for products side, but keeping placeholder if needed or just empty
    // Actually, usually we define the 'many' side here if reciprocal.
    // Given the previous code didn't have much here, I'll close it properly.
}));

export const salesRelations = relations(sales, ({ many, one }) => ({
    items: many(saleItems),
    shift: one(shifts, { fields: [sales.shift_id], references: [shifts.id] }),
    device: one(devices, { fields: [sales.source_device_id], references: [devices.id] })
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

export const AppSchema = new Schema({
    // Core Reference
    organizations: new Table({
        name: column.text,
        nit: column.text,
        address: column.text,
        phone: column.text,
        email: column.text,
        created_at: column.text,
        updated_at: column.text
    }),
    categories: new Table({
        organization_id: column.text,
        name: column.text,
        color: column.text,
        icon: column.text,
        sort_order: column.integer
    }),
    products: new Table({
        organization_id: column.text,
        category_id: column.text, // Changed from 'category' to 'category_id'
        name: column.text,
        description: column.text,
        price: column.real,
        cost_price: column.real,
        sku: column.text,
        barcode: column.text,
        tax_rate: column.real,
        active: column.integer,
        stock: column.integer,
        min_stock: column.integer,
        max_stock: column.integer,
        supplier_id: column.text,
        image_url: column.text,
        last_synced_at: column.text,
        deleted_at: column.text
    }),
    inventory_items: new Table({
        organization_id: column.text,
        name: column.text,
        unit: column.text,
        min_stock_alert: column.real
    }),
    product_recipes: new Table({
        product_id: column.text,
        ingredient_id: column.text,
        quantity_required: column.real
    }),
    branch_ingredients: new Table({
        organization_id: column.text,
        branch_id: column.text,
        ingredient_id: column.text,
        current_stock: column.real,
        last_updated: column.text
    }),
    branch_products: new Table({
        branch_id: column.text,
        product_id: column.text,
        is_active: column.integer
    }),

    // Branches & Devices
    branches: new Table({
        organization_id: column.text,
        name: column.text,
        city: column.text,
        address: column.text,
        nit: column.text,
        phone: column.text,
        deleted_at: column.text,
        created_at: column.text,
        updated_at: column.text
    }),
    devices: new Table({
        organization_id: column.text,
        branch_id: column.text,
        name: column.text,
        status: column.text,
        type: column.text,
        fingerprint: column.text,
        app_version: column.text,
        created_at: column.text,
        updated_at: column.text,
        deleted_at: column.text
    }),

    // Sales & Orders
    orders: new Table({
        organization_id: column.text,
        branch_id: column.text,
        sale_id: column.text,
        table_id: column.text,
        shift_id: column.text,
        created_by: column.text,
        total_amount: column.real,
        status: column.text,
        customer_name: column.text,
        diners: column.integer,
        cancellation_reason: column.text,
        created_at: column.text,
        synced: column.integer
    }),
    order_items: new Table({
        organization_id: column.text,
        order_id: column.text,
        product_id: column.text,
        quantity: column.real,
        unit_price: column.real,
        total_price: column.real,
        notes: column.text
    }),
    sales: new Table({
        organization_id: column.text,
        branch_id: column.text,
        shift_id: column.text,
        total_amount: column.real,
        status: column.text,
        payment_method: column.text,
        payment_data: column.text,
        tip_amount: column.real,
        discount_amount: column.real,
        discount_reason: column.text,
        diners: column.integer,
        created_at: column.text,
        created_by: column.text,
        sale_channel: column.text,
        source_device_id: column.text,
        created_by_system: column.text,
        client_id: column.text,
        synced: column.integer
    }),
    sale_items: new Table({
        organization_id: column.text,
        sale_id: column.text,
        product_id: column.text,
        quantity: column.real,
        unit_price: column.real,
        unit_cost: column.real,
        tax_amount: column.real,
        total_price: column.real
    }),
    shifts: new Table({
        organization_id: column.text,
        branch_id: column.text,
        user_id: column.text,
        start_time: column.text,
        end_time: column.text,
        initial_cash: column.real,
        final_cash: column.real,
        expected_cash: column.real,
        status: column.text,
        turn_type: column.text,
        closing_metadata: column.text,
        notes: column.text,
        pending_tips: column.real,
        synced: column.integer,
        deleted_at: column.text
    }),
    expenses: new Table({
        organization_id: column.text,
        branch_id: column.text,
        shift_id: column.text,
        user_id: column.text,
        description: column.text,
        amount: column.real,
        category: column.text,
        voucher_number: column.text,
        authorize_user_id: column.text,
        created_at: column.text,
        synced: column.integer
    }),
    tip_distributions: new Table({
        organization_id: column.text,
        shift_id: column.text,
        employee_id: column.text,
        employee_name: column.text,
        amount: column.real,
        created_at: column.text,
        synced: column.integer
    }),

    // Delivery
    deliveries: new Table({
        organization_id: column.text,
        branch_id: column.text,
        customer_name: column.text,
        customer_phone: column.text,
        customer_address: column.text,
        product_details: column.text,
        delivery_fee: column.real,
        status: column.text,
        assigned_driver: column.text,
        created_at: column.text,
        synced: column.integer
    }),
    rappi_deliveries: new Table({
        organization_id: column.text,
        rappi_order_id: column.text,
        branch_id: column.text,
        product_details: column.text,
        total_value: column.real,
        status: column.text,
        delivery_code: column.text,
        notes: column.text,
        created_at: column.text,
        synced: column.integer
    }),

    // Misc
    clients: new Table({
        organization_id: column.text,
        full_name: column.text,
        document_id: column.text,
        phone: column.text,
        email: column.text,
        points: column.integer,
        last_visit: column.text,
        preferences: column.text,
        created_at: column.text,
        updated_at: column.text,
        synced: column.integer,
        deleted_at: column.text
    }),
    users: new Table({
        organization_id: column.text,
        email: column.text,
        full_name: column.text,
        role: column.text,
        deleted_at: column.text,
        active: column.integer
    }),
    tables: new Table({
        organization_id: column.text,
        branch_id: column.text,
        name: column.text,
        status: column.text,
        created_at: column.text,
        updated_at: column.text
    }),
    stock_reservations: new Table({
        organization_id: column.text,
        product_id: column.text,
        quantity: column.real,
        source_type: column.text,
        source_id: column.text,
        status: column.text,
        created_at: column.text
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
    devices,
    // Relations
    salesRelations,
    saleItemsRelations,
    ordersRelations,
    shiftsRelations,
    devicesRelations,
    productsRelations
};
