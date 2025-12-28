import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
// We use relative import, assuming compilation handles it or we fix tsconfig later
// For now, let's define types here or cast to any to avoid build complexity in this step
// if src/types/index.ts is not reachable.
// Actually, let's try to import.
import { Product, User, Sale, SaleItem } from './types'; // Local import

// DB File Path
const dbPath = path.join(app.getPath('userData'), 'pos.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

export function initDB() {
    console.log('Initializing Database at', dbPath);

    const schema = `
    -- Local Products Mirror
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category TEXT,
      active INTEGER DEFAULT 1,
      image_url TEXT,
      last_synced_at TEXT
    );

    -- Local Users Mirror
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      full_name TEXT,
      role TEXT
    );

    -- Branches Mirror
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT,
      address TEXT
    );

    -- Shifts Table
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      initial_cash REAL DEFAULT 0,
      final_cash REAL,
      expected_cash REAL,
      status TEXT DEFAULT 'open',
      turn_type TEXT,
      synced INTEGER DEFAULT 0
    );

    -- Tables (Restaurant Tables/Mesas)
    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Orders (Pending/In-Progress)
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      table_id TEXT,
      shift_id TEXT,
      branch_id TEXT NOT NULL,
      created_by TEXT,
      customer_name TEXT DEFAULT 'Cliente General',
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
      total_amount REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0,
      FOREIGN KEY(table_id) REFERENCES tables(id),
      FOREIGN KEY(shift_id) REFERENCES shifts(id)
    );

    -- Order Items
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    -- Local Sales (Queue)
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL,
      shift_id TEXT,
      order_id TEXT,
      created_by TEXT NOT NULL,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      status TEXT DEFAULT 'completed',
      created_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      FOREIGN KEY(shift_id) REFERENCES shifts(id),
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      FOREIGN KEY(sale_id) REFERENCES sales(id)
    );
  `;

    db.exec(schema);
}

// Data Access Objects

export const ProductDAO = {
    upsertMany: (products: Product[]) => {
        const insert = db.prepare(`
      INSERT OR REPLACE INTO products (id, name, description, price, category, active, image_url, last_synced_at)
      VALUES (@id, @name, @description, @price, @category, @active, @image_url, @last_synced_at)
    `);
        const insertMany = db.transaction((items: Product[]) => {
            for (const item of items) insert.run({
                ...item,
                active: item.active ? 1 : 0
            });
        });
        insertMany(products);
    },

    getAll: (): Product[] => {
        return db.prepare('SELECT * FROM products WHERE active = 1').all() as Product[];
    }
};

export const UserDAO = {
    upsertMany: (users: User[]) => {
        const insert = db.prepare(`
            INSERT OR REPLACE INTO users (id, email, full_name, role)
            VALUES (@id, @email, @full_name, @role)
        `);
        const insertMany = db.transaction((items: User[]) => {
            for (const item of items) insert.run(item);
        });
        insertMany(users);
    },

    getAll: (): User[] => {
        return db.prepare('SELECT * FROM users').all() as User[];
    }
};

// BRANCH DAO
export const BranchDAO = {
    upsertMany: (branches: { id: string, name: string, city?: string, address?: string }[]) => {
        const insert = db.prepare(`
            INSERT OR REPLACE INTO branches (id, name, city, address)
            VALUES (@id, @name, @city, @address)
        `);
        const insertMany = db.transaction((items) => {
            for (const item of items) insert.run(item);
        });
        insertMany(branches);
    },

    getAll: () => {
        return db.prepare('SELECT * FROM branches ORDER BY name').all();
    }
};

// SHIFT DAO
export const ShiftDAO = {
    create: (shift: any) => {
        db.prepare(`
            INSERT INTO shifts (id, branch_id, user_id, start_time, initial_cash, status, turn_type, synced)
            VALUES (@id, @branch_id, @user_id, @start_time, @initial_cash, 'open', @turn_type, 0)
        `).run(shift);
    },

    close: (id: string, endTime: string, finalCash: number, expectedCash: number) => {
        db.prepare(`
            UPDATE shifts 
            SET end_time = ?, final_cash = ?, expected_cash = ?, status = 'closed' 
            WHERE id = ?
        `).run(endTime, finalCash, expectedCash, id);
    },

    getCurrent: (): any | null => {
        return db.prepare("SELECT * FROM shifts WHERE status = 'open' ORDER BY start_time DESC LIMIT 1").get();
    },

    getSummary: (shiftId: string) => {
        // Calculate totals for the shift
        const sales = db.prepare("SELECT * FROM sales WHERE shift_id = ?").all(shiftId) as Sale[];

        let totalSales = 0;
        let cashSales = 0;
        let cardSales = 0;
        let transferSales = 0;

        sales.forEach(s => {
            totalSales += s.total_amount;
            if (s.payment_method === 'cash') cashSales += s.total_amount;
            if (s.payment_method === 'card') cardSales += s.total_amount;
            if (s.payment_method === 'transfer') transferSales += s.total_amount;
        });

        // Get sold products summary
        const productsQuery = `
            SELECT p.name, SUM(si.quantity) as quantity, SUM(si.total_price) as total
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            WHERE s.shift_id = ?
            GROUP BY p.name
        `;
        const productsSold = db.prepare(productsQuery).all(shiftId);

        return {
            totalSales,
            cashSales,
            cardSales,
            transferSales,
            productsSold,
            salesCount: sales.length
        };
    }
};

export const SaleDAO = {
    create: (sale: Sale, items: SaleItem[]) => {
        const insertSale = db.prepare(`
            INSERT INTO sales (id, branch_id, shift_id, created_by, total_amount, payment_method, status, created_at, synced)
            VALUES (@id, @branch_id, @shift_id, @created_by, @total_amount, @payment_method, @status, @created_at, @synced)
        `);

        const insertItem = db.prepare(`
            INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, total_price)
            VALUES (@id, @sale_id, @product_id, @quantity, @unit_price, @total_price)
        `);

        // Check if shift is open
        if (sale.shift_id) {
            const shift = db.prepare("SELECT status FROM shifts WHERE id = ?").get(sale.shift_id) as any;
            if (!shift || shift.status !== 'open') {
                throw new Error("Cannot register sale: Shift is closed or invalid.");
            }
        } else {
            // Optional: Allow sales without shift? No, user requested strict shifts.
            // throw new Error("Sale must belong to an active shift.");
            // For now we allow it but log a warning if strict mode is needed
        }

        const transaction = db.transaction(() => {
            insertSale.run({
                ...sale,
                synced: sale.synced ? 1 : 0
            });
            for (const item of items) insertItem.run(item);
        });

        transaction();
    },

    getPending: (): (Sale & { items: SaleItem[] })[] => {
        const sales = db.prepare('SELECT * FROM sales WHERE synced = 0').all() as Sale[];
        return sales.map(s => {
            const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(s.id) as SaleItem[];
            return { ...s, items, synced: Boolean(s.synced) };
        });
    },

    markSynced: (saleId: string) => {
        db.prepare('UPDATE sales SET synced = 1 WHERE id = ?').run(saleId);
    }
};

// TABLE DAO
export const TableDAO = {
    create: (table: any) => {
        const insert = db.prepare(`
            INSERT INTO tables (id, branch_id, name, status)
            VALUES (@id, @branch_id, @name, @status)
        `);
        insert.run(table);
    },

    update: (id: string, data: any) => {
        const update = db.prepare(`
            UPDATE tables 
            SET name = @name, status = @status, updated_at = datetime('now')
            WHERE id = @id
        `);
        update.run({ id, ...data });
    },

    delete: (id: string) => {
        db.prepare('DELETE FROM tables WHERE id = ?').run(id);
    },

    getByBranch: (branchId: string) => {
        return db.prepare('SELECT * FROM tables WHERE branch_id = ? ORDER BY name').all(branchId);
    },

    getById: (id: string) => {
        return db.prepare('SELECT * FROM tables WHERE id = ?').get(id);
    },

    updateStatus: (id: string, status: string) => {
        db.prepare(`UPDATE tables SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);
    }
};

// ORDER DAO
export const OrderDAO = {
    create: (order: any, items: any[]) => {
        const insertOrder = db.prepare(`
            INSERT INTO orders (id, table_id, shift_id, branch_id, created_by, customer_name, status, total_amount)
            VALUES (@id, @table_id, @shift_id, @branch_id, @created_by, @customer_name, @status, @total_amount)
        `);

        const insertItem = db.prepare(`
            INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price)
            VALUES (@id, @order_id, @product_id, @quantity, @unit_price, @total_price)
        `);

        const transaction = db.transaction(() => {
            insertOrder.run(order);
            for (const item of items) {
                insertItem.run(item);
            }
        });

        transaction();
    },

    getByTable: (tableId: string) => {
        return db.prepare(`
            SELECT * FROM orders WHERE table_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1
        `).get(tableId);
    },

    getItems: (orderId: string) => {
        return db.prepare(`
            SELECT oi.*, p.name as product_name 
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `).all(orderId);
    },

    updateTotal: (orderId: string, total: number) => {
        db.prepare(`UPDATE orders SET total_amount = ?, updated_at = datetime('now') WHERE id = ?`).run(total, orderId);
    },

    complete: (orderId: string) => {
        db.prepare(`UPDATE orders SET status = 'completed', updated_at = datetime('now') WHERE id = ?`).run(orderId);
    },

    addItem: (item: any) => {
        db.prepare(`
            INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price)
            VALUES (@id, @order_id, @product_id, @quantity, @unit_price, @total_price)
        `).run(item);
    },

    deleteItem: (itemId: string) => {
        db.prepare('DELETE FROM order_items WHERE id = ?').run(itemId);
    }
};
