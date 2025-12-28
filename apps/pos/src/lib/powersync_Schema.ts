import { Schema, Table, Column } from '@powersync/web';

const ColumnType = {
    TEXT: 'TEXT',
    INTEGER: 'INTEGER',
    REAL: 'REAL'
} as const;

export const AppSchema = new Schema({
    products: new Table({
        name: new Column({ type: ColumnType.TEXT }),
        price: new Column({ type: ColumnType.REAL }),
        cost: new Column({ type: ColumnType.REAL }),
        category: new Column({ type: ColumnType.TEXT }),
        image_url: new Column({ type: ColumnType.TEXT }),
        active: new Column({ type: ColumnType.INTEGER }),
        deleted_at: new Column({ type: ColumnType.TEXT })
    }),
    users: new Table({
        email: new Column({ type: ColumnType.TEXT }),
        full_name: new Column({ type: ColumnType.TEXT }),
        role: new Column({ type: ColumnType.TEXT }),
        pin_hash: new Column({ type: ColumnType.TEXT }),
        branch_id: new Column({ type: ColumnType.TEXT }),
        deleted_at: new Column({ type: ColumnType.TEXT })
    }),
    branches: new Table({
        name: new Column({ type: ColumnType.TEXT }),
        city: new Column({ type: ColumnType.TEXT }),
        address: new Column({ type: ColumnType.TEXT }),
        deleted_at: new Column({ type: ColumnType.TEXT })
    }),
    shifts: new Table({
        user_id: new Column({ type: ColumnType.TEXT }),
        branch_id: new Column({ type: ColumnType.TEXT }),
        start_time: new Column({ type: ColumnType.TEXT }),
        end_time: new Column({ type: ColumnType.TEXT }),
        initial_cash: new Column({ type: ColumnType.REAL }),
        final_cash: new Column({ type: ColumnType.REAL }),
        status: new Column({ type: ColumnType.TEXT }),
        turn_type: new Column({ type: ColumnType.TEXT }),
        closing_metadata: new Column({ type: ColumnType.TEXT }),
        deleted_at: new Column({ type: ColumnType.TEXT })
    }),
    tables: new Table({
        branch_id: new Column({ type: ColumnType.TEXT }),
        name: new Column({ type: ColumnType.TEXT }),
        status: new Column({ type: ColumnType.TEXT }),
        x_position: new Column({ type: ColumnType.INTEGER }),
        y_position: new Column({ type: ColumnType.INTEGER }),
        deleted_at: new Column({ type: ColumnType.TEXT })
    }),
    orders: new Table({
        branch_id: new Column({ type: ColumnType.TEXT }),
        table_id: new Column({ type: ColumnType.TEXT }),
        shift_id: new Column({ type: ColumnType.TEXT }),
        user_id: new Column({ type: ColumnType.TEXT }),
        client_id: new Column({ type: ColumnType.TEXT }),
        status: new Column({ type: ColumnType.TEXT }),
        order_type: new Column({ type: ColumnType.TEXT }),
        total: new Column({ type: ColumnType.REAL }),
        notes: new Column({ type: ColumnType.TEXT }),
        diners: new Column({ type: ColumnType.INTEGER }),
        deleted_at: new Column({ type: ColumnType.TEXT })
    }),
    order_items: new Table({
        order_id: new Column({ type: ColumnType.TEXT }),
        product_id: new Column({ type: ColumnType.TEXT }),
        quantity: new Column({ type: ColumnType.INTEGER }),
        unit_price: new Column({ type: ColumnType.REAL }),
        total_price: new Column({ type: ColumnType.REAL }),
        notes: new Column({ type: ColumnType.TEXT }),
        status: new Column({ type: ColumnType.TEXT }),
        deleted_at: new Column({ type: ColumnType.TEXT })
    }),
    transaction_events: new Table({
        event_type: new Column({ type: ColumnType.TEXT }),
        payload: new Column({ type: ColumnType.TEXT }),
        metadata: new Column({ type: ColumnType.TEXT }),
        created_at: new Column({ type: ColumnType.TEXT }),
        synced_at: new Column({ type: ColumnType.TEXT })
    }),
    clients: new Table({
        name: new Column({ type: ColumnType.TEXT }),
        phone: new Column({ type: ColumnType.TEXT }),
        email: new Column({ type: ColumnType.TEXT }),
        address: new Column({ type: ColumnType.TEXT }),
        document_id: new Column({ type: ColumnType.TEXT }),
        deleted_at: new Column({ type: ColumnType.TEXT })
    }),
    expenses: new Table({
        shift_id: new Column({ type: ColumnType.TEXT }),
        amount: new Column({ type: ColumnType.REAL }),
        description: new Column({ type: ColumnType.TEXT }),
        category: new Column({ type: ColumnType.TEXT }),
        voucher_number: new Column({ type: ColumnType.TEXT }),
        deleted_at: new Column({ type: ColumnType.TEXT })
    })
});
