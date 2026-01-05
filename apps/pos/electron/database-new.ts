import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { Product, User, Sale, SaleItem } from './types';

const dbPath = path.join(app.getPath('userData'), 'pos.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Database Migrations
// Database Migrations - Function definition moved to bottom


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
      closing_metadata TEXT,
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

    -- Clients / Loyalty
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      document_id TEXT UNIQUE,
      phone TEXT,
      email TEXT,
      points INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0
    );
  `;

  db.exec(schema);
  runMigrations(); // Run after schema creation
}

export const ClientDAO = {
  search: (query: string) => {
    const stmt = db.prepare(`
            SELECT * FROM clients 
            WHERE full_name LIKE @query 
            OR phone LIKE @query 
            OR email LIKE @query
            OR document_id LIKE @query
            LIMIT 20
        `);
    return stmt.all({ query: `%${query}%` });
  },
  create: (client: any) => {
    // Check if client exists by document_id first to return it
    if (client.document_id) {
      const existing = db.prepare('SELECT * FROM clients WHERE document_id = ?').get(client.document_id);
      if (existing) {
        // Optionally update details here if needed, for now just return existing
        return { ...existing, _existed: true };
      }
    }

    const stmt = db.prepare(`
            INSERT INTO clients (id, full_name, document_id, phone, email, points, created_at, updated_at, synced)
            VALUES (@id, @full_name, @document_id, @phone, @email, @points, @created_at, @updated_at, @synced)
        `);
    stmt.run(client);
    return client;
  },
  getAll: () => {
    return db.prepare('SELECT * FROM clients').all();
  },
  upsertMany: (clients: any[]) => {
    const insert = db.prepare(`
            INSERT OR REPLACE INTO clients (id, full_name, document_id, phone, email, points, created_at, updated_at, synced)
            VALUES (@id, @full_name, @document_id, @phone, @email, @points, @created_at, @updated_at, 1)
        `);
    const insertMany = db.transaction((rows) => {
      for (const row of rows) insert.run(row);
    });
    insertMany(clients);
  }
};

export const ProductDAO = {
  getAll: () => db.prepare('SELECT * FROM products').all(),
  upsertMany: (products: any[]) => {
    const insert = db.prepare(`
        INSERT OR REPLACE INTO products (id, name, description, price, category, active, image_url, last_synced_at)
        VALUES (@id, @name, @description, @price, @category, @active, @image_url, @last_synced_at)
      `);
    const insertMany = db.transaction((rows) => {
      for (const row of rows) insert.run({
        ...row,
        active: row.active ? 1 : 0
      });
    });
    insertMany(products);
  }
};

export const UserDAO = {
  getAll: () => db.prepare('SELECT * FROM users').all(),
  upsertMany: (users: any[]) => {
    const insert = db.prepare(`
        INSERT OR REPLACE INTO users (id, email, full_name, role)
        VALUES (@id, @email, @full_name, @role)
      `);
    const insertMany = db.transaction((rows) => {
      for (const row of rows) insert.run(row);
    });
    insertMany(users);
  }
};

export const BranchDAO = {
  getAll: () => db.prepare('SELECT * FROM branches').all(),
  upsertMany: (branches: any[]) => {
    const insert = db.prepare(`
        INSERT OR REPLACE INTO branches (id, name, city, address)
        VALUES (@id, @name, @city, @address)
      `);
    const insertMany = db.transaction((rows) => {
      for (const row of rows) insert.run(row);
    });
    insertMany(branches);
  }
};

export const ShiftDAO = {
  create: (shift: any) => {
    const stmt = db.prepare(`
        INSERT INTO shifts (id, branch_id, user_id, start_time, initial_cash, status, synced)
        VALUES (@id, @branch_id, @user_id, @start_time, @initial_cash, 'open', 0)
      `);
    return stmt.run(shift);
  },
  close: (data: { id: string, endTime: string, finalCash: number, expectedCash: number, closing_metadata?: any }) => {
    const stmt = db.prepare(`
        UPDATE shifts 
        SET end_time = @endTime, 
            final_cash = @finalCash, 
            expected_cash = @expectedCash, 
            closing_metadata = @closing_metadata,
            status = 'closed', 
            synced = 0
        WHERE id = @id
      `);
    return stmt.run({
      ...data,
      closing_metadata: data.closing_metadata ? JSON.stringify(data.closing_metadata) : null
    });
  },
  getCurrent: () => {
    return db.prepare("SELECT * FROM shifts WHERE status = 'open' ORDER BY start_time DESC LIMIT 1").get();
  },
  getSummary: (shiftId: string) => {
    const sales = db.prepare("SELECT * FROM sales WHERE shift_id = ?").all(shiftId) as any[];
    const totalSales = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const transactionCount = sales.length;
    return { totalSales, transactionCount, sales };
  }
};

export const TableDAO = {
  getByBranch: (branchId: string) => {
    return db.prepare("SELECT * FROM tables WHERE branch_id = ?").all(branchId);
  },
  create: (table: any) => {
    const stmt = db.prepare(`
            INSERT INTO tables (id, branch_id, name, status, created_at, updated_at)
            VALUES (@id, @branch_id, @name, 'available', datetime('now'), datetime('now'))
        `);
    return stmt.run(table);
  },
  update: (id: string, data: any) => {
    const sets: string[] = [];
    const values: any = { id };

    if (data.status) {
      sets.push('status = @status');
      values.status = data.status;
    }
    if (data.name) {
      sets.push('name = @name');
      values.name = data.name;
    }

    sets.push("updated_at = datetime('now')");

    const stmt = db.prepare(`UPDATE tables SET ${sets.join(', ')} WHERE id = @id`);
    return stmt.run(values);
  },
  delete: (id: string) => {
    return db.prepare("DELETE FROM tables WHERE id = ?").run(id);
  }
};


export const SaleDAO = {
  create: (sale: any, items: any[]) => {
    const insertSale = db.prepare(`
        INSERT INTO sales (id, branch_id, shift_id, order_id, client_id, created_by, total_amount, payment_method, status, created_at, synced)
        VALUES (@id, @branch_id, @shift_id, @order_id, @client_id, @created_by, @total_amount, @payment_method, @status, @created_at, 0)
      `);

    const insertItem = db.prepare(`
        INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price)
        VALUES (@id, @order_id, @product_id, @quantity, @unit_price, @total_price)
      `);

    const transaction = db.transaction(() => {
      insertSale.run(sale);
      for (const item of items) insertItem.run(item);
    });

    return transaction();
  },
  getPending: () => {
    const sales = db.prepare("SELECT * FROM sales WHERE synced = 0").all();
    // TODO: Get items for each sale if needed for sync
    return sales;
  },
  markSynced: (saleId: string) => {
    return db.prepare("UPDATE sales SET synced = 1 WHERE id = ?").run(saleId);
  }
};


function runMigrations() {
  console.log('[DB Migrations] Checking for schema updates...');
  try {
    const tableInfo = db.prepare("PRAGMA table_info(sales)").all() as any[];
    const hasShiftId = tableInfo.some((col: any) => col.name === 'shift_id');
    if (!hasShiftId) {
      console.log('[DB Migrations] Adding shift_id column to sales...');
      db.exec(`ALTER TABLE sales ADD COLUMN shift_id TEXT`);
      console.log('[DB Migrations] ✅ shift_id added');
    }
    const hasOrderId = tableInfo.some((col: any) => col.name === 'order_id');
    if (!hasOrderId) {
      console.log('[DB Migrations] Adding order_id column to sales...');
      db.exec(`ALTER TABLE sales ADD COLUMN order_id TEXT`);
      console.log('[DB Migrations] ✅ order_id added');
    }
    const hasClientId = tableInfo.some((col: any) => col.name === 'client_id');
    if (!hasClientId) {
      console.log('[DB Migrations] Adding client_id column to sales...');
      db.exec(`ALTER TABLE sales ADD COLUMN client_id TEXT REFERENCES clients(id)`);
      console.log('[DB Migrations] ✅ client_id added');
    }

    // Clients Migration for document_id
    const clientInfo = db.prepare("PRAGMA table_info(clients)").all() as any[];
    if (clientInfo && clientInfo.length > 0) {
      const hasDocumentId = clientInfo.some((col: any) => col.name === 'document_id');
      if (!hasDocumentId) {
        console.log('[DB Migrations] Adding document_id column to clients...');
        db.exec(`ALTER TABLE clients ADD COLUMN document_id TEXT UNIQUE`);
        console.log('[DB Migrations] ✅ document_id added');
      }
    }

    // Shifts Migration for closing_metadata
    const shiftsInfo = db.prepare("PRAGMA table_info(shifts)").all() as any[];
    if (shiftsInfo && shiftsInfo.length > 0) {
      const hasMetadata = shiftsInfo.some((col: any) => col.name === 'closing_metadata');
      if (!hasMetadata) {
        console.log('[DB Migrations] Adding closing_metadata column to shifts...');
        db.exec(`ALTER TABLE shifts ADD COLUMN closing_metadata TEXT`);
        console.log('[DB Migrations] ✅ closing_metadata added');
      }
    }

    console.log('[DB Migrations] ✅ All migrations completed');
  } catch (error) {
    console.error('[DB Migrations] Error:', error);
  }
}
