import { Database } from 'better-sqlite3';

/**
 * Development utility to reset sales data and generate realistic mock data
 * Run this to test dashboard features with proper historical data
 */
export function resetAndGenerateMockData(db: Database) {
    console.log('🔄 [DEV] Resetting database and generating mock data...');

    try {
        // Step 1: Clear old sales data
        db.exec(`
            DELETE FROM sale_items;
            DELETE FROM sales;
        `);
        console.log('✅ [DEV] Cleared old sales data');

        // Step 2: Get products for mock sales
        const products = db.prepare('SELECT id, name, price FROM products WHERE active = 1 LIMIT 20').all() as any[];
        if (products.length === 0) {
            throw new Error('No products found in database. Please sync products first.');
        }

        // Step 3: Get context (branch, user, active shift)
        // Fixed: branches and users tables don't have created_at in local SQLite
        const branch = db.prepare('SELECT id FROM branches LIMIT 1').get() as any;
        const user = db.prepare('SELECT id FROM users LIMIT 1').get() as any;
        const currentShift = db.prepare('SELECT id FROM shifts WHERE status = "open" LIMIT 1').get() as any;

        if (!branch) {
            throw new Error('No branch data found. Please login first.');
        }

        const branchId = branch.id;
        const userId = user?.id || 'system-dev';
        const activeShiftId = currentShift?.id || null;

        // Step 4: Prepare insert statements 
        const insertSale = db.prepare(`
            INSERT INTO sales (
                id, branch_id, shift_id, created_by, created_by_system, 
                sale_channel, total_amount, payment_method, status, 
                tip_amount, created_at, synced
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, 1)
        `);

        const insertSaleItem = db.prepare(`
            INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, total_price)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        // Step 5: Generate Mock Sales (300 sales over 60 days)
        const channels = ['pos', 'delivery', 'rappi', 'registered', 'web'];
        const paymentMethods = ['cash', 'transfer', 'card'];
        const channelSystems: any = {
            'pos': null,
            'delivery': 'pos-delivery',
            'rappi': 'pos-rappi',
            'registered': null,
            'web': 'web'
        };

        const now = new Date();
        const totalSales = 300;

        const runTransaction = db.transaction(() => {
            for (let i = 0; i < totalSales; i++) {
                let saleDate: Date;
                let saleShiftId = null;

                if (i < 40) {
                    // Current window (Today)
                    saleDate = new Date(now);
                    const hour = Math.floor(Math.random() * 10) + 8; // Spread throughout the day
                    saleDate.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
                    saleShiftId = activeShiftId;
                } else {
                    // History (last 60 days)
                    const daysAgo = Math.floor(Math.random() * 60) + 1;
                    const hour = Math.floor(Math.random() * 12) + 8; // 8:00 - 20:00
                    saleDate = new Date(now);
                    saleDate.setDate(saleDate.getDate() - daysAgo);
                    saleDate.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
                }

                const channel = channels[Math.floor(Math.random() * channels.length)];
                const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
                const createdBySystem = channelSystems[channel];

                const itemsInSale = Math.floor(Math.random() * 4) + 1;
                const selectedProducts = [];
                for (let j = 0; j < itemsInSale; j++) {
                    const product = products[Math.floor(Math.random() * products.length)];
                    const quantity = Math.floor(Math.random() * 3) + 1;
                    selectedProducts.push({ ...product, quantity });
                }

                const totalAmount = selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
                const tipAmount = paymentMethod !== 'cash' ? Math.floor(Math.random() * 5000) : 0;

                const saleId = `mock-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`;

                // 6. Insert Sale
                insertSale.run(
                    saleId,
                    branchId,
                    saleShiftId,
                    userId,
                    createdBySystem,
                    channel,
                    totalAmount,
                    paymentMethod,
                    tipAmount,
                    saleDate.toISOString()
                );

                // 7. Insert Items
                selectedProducts.forEach((p, idx) => {
                    insertSaleItem.run(
                        `${saleId}-i-${idx}`,
                        saleId,
                        p.id,
                        p.quantity,
                        p.price,
                        p.price * p.quantity
                    );
                });
            }
        });

        runTransaction();

        console.log(`✅ [DEV] Succesfully generated ${totalSales} mock sales over 60 days.`);
        return { success: true, count: totalSales };

    } catch (error: any) {
        console.error('❌ [DEV] Mock generator error:', error.message);
        return { success: false, error: error.message };
    }
}
/**
 * Generate mock employees for testing tips distribution
 */
export function generateMockEmployees(db: Database) {
    console.log('🔄 [DEV] Generating mock employees...');
    try {
        const stmt = db.prepare(`
            INSERT INTO users (id, email, full_name, role)
            VALUES (?, ?, ?, ?)
        `);

        const branch = db.prepare('SELECT id FROM branches LIMIT 1').get() as any;
        const branchId = branch?.id || 'branch-1';

        const roles = ['cajero', 'cajero', 'cajero', 'admin', 'cajero'];
        const names = ['Juan Pérez', 'Ana Gómez', 'Carlos Ruiz', 'Maria Lopez', 'Pedro Diaz'];

        const transaction = db.transaction(() => {
            names.forEach((name, idx) => {
                const id = `mock-user-${Date.now()}-${idx}`;
                const username = name.split(' ')[0].toLowerCase() + idx;
                const email = `${username}@panpanocha.com`;

                stmt.run(
                    id,
                    email,
                    name,
                    roles[idx]
                );
            });
        });

        transaction();
        console.log(`✅ [DEV] Generated ${names.length} mock employees.`);
        return { success: true, count: names.length };
    } catch (error: any) {
        console.error('❌ [DEV] Error generating employees:', error.message);
        return { success: false, error: error.message };
    }
}
