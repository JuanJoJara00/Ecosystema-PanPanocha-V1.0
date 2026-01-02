/// <reference types="node" />
/**
 * Database check script for Supabase connection verification.
 * Run with: npx ts-node --project scripts/tsconfig.json scripts/check_db.ts
 * 
 * Must be run from the repository root directory.
 * Requires: pnpm add -D @types/node @supabase/supabase-js (at workspace root)
 */
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Find project root by looking for package.json
 */
function findProjectRoot(startPath: string): string {
    let current = startPath;
    while (current !== path.parse(current).root) {
        if (fs.existsSync(path.join(current, 'package.json'))) {
            return current;
        }
        current = path.dirname(current);
    }
    return startPath;
}

const projectRoot = findProjectRoot(__dirname);
const envPath = path.join(projectRoot, 'apps/portal/.env.local');

// Manual .env parsing to avoid dotenv dependency
if (fs.existsSync(envPath)) {
    try {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^= #]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
        console.log(`Loaded env from: ${envPath}`);
    } catch (e: unknown) {
        console.error(`Failed to load env file from: ${envPath}`);
        if (e instanceof Error) console.error('Error:', e.message);
        process.exit(1);
    }
} else {
    console.error(`Error: Environment file not found at ${envPath}`);
    console.error('Please ensure apps/portal/.env.local exists with Supabase credentials.');
    process.exit(1);
}

/**
 * Types for Supabase tables (DB-specific).
 * These match the actual database schema, not the application types.
 * TODO: Consider generating Supabase types with `npx supabase gen types typescript`
 */
interface DbBranch {
    id: string;
    organization_id: string;
    name: string;
    city?: string;
    address?: string;
    phone?: string;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
}

interface DbInventoryItem {
    id: string;
    organization_id: string;
    name: string;
    sku?: string;
    category?: string;
    unit?: string;
    cost_price?: number;
    created_at?: string;
}

interface DbBranchInventory {
    id?: string;
    branch_id: string;
    item_id: string;
    quantity: number;
    last_updated?: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.log('Missing env vars:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
    });
    console.log('Ensure you run this script from the repository root:');
    console.log('  npx ts-node --project scripts/tsconfig.json scripts/check_db.ts');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check(): Promise<void> {
    console.log('Checking Supabase connection...');
    console.log(`Using project root: ${projectRoot}`);

    // Check Branches
    const { data: branches, error: errBranches } = await supabase
        .from('branches')
        .select('*');

    if (errBranches) {
        console.error('Error fetching branches:', errBranches);
    } else {
        const branchList = branches as DbBranch[] | null;
        console.log(`Branches found: ${branchList?.length ?? 0}`);
        if (branchList && branchList.length > 0) {
            console.log('Sample Branch:', branchList[0]);
        }
    }

    // Check Items
    const { data: items, error: errItems } = await supabase
        .from('inventory_items')
        .select('*');

    if (errItems) {
        console.error('Error fetching inventory_items:', errItems);
    } else {
        const itemList = items as DbInventoryItem[] | null;
        console.log(`Inventory Items found: ${itemList?.length ?? 0}`);

        if (itemList && itemList.length > 0) {
            console.log('Sample Item:', itemList[0]);
        }

        // Check Branch Inventory
        const { data: joinData, error: errJoin } = await supabase
            .from('branch_inventory')
            .select('*');

        if (errJoin) {
            console.error('Error fetching branch_inventory:', errJoin);
        } else {
            const joinList = joinData as DbBranchInventory[] | null;
            console.log(`Branch Inventory records found: ${joinList?.length ?? 0}`);
        }
    }
}

check().catch((err: unknown) => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
