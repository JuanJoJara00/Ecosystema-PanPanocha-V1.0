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
    throw new Error(`Could not find project root (package.json) starting from ${startPath}.`);
}

const projectRoot = findProjectRoot(__dirname);
const envPath = path.join(projectRoot, 'apps/portal/.env.local');

// Manual .env parsing to avoid dotenv dependency
if (fs.existsSync(envPath)) {
    try {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            // Match KEY=VALUE, where VALUE can contain = (e.g. base64)
            // But exclude comments starting with #
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
            if (match) {
                const key = match[1];
                let value = match[2] ? match[2].trim() : '';

                // Inline comments support is omitted for simplicity in this utility script.

                // Strip surrounding quotes
                if (value.length > 1 &&
                    ((value.startsWith('"') && value.endsWith('"')) ||
                        (value.startsWith("'") && value.endsWith("'")))) {
                    value = value.slice(1, -1);
                }

                // Precedence: Existing process.env vars (SYSTEM) > .env file
                // Only set if not already defined to preserve system/container settings
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
 * Types for Supabase tables (Generated).
 * These match the actual database schema.
 */
import type { Database } from '../apps/portal/src/types/supabase';

type DbBranch = Database['public']['Tables']['branches']['Row'];
type DbInventoryItem = Database['public']['Tables']['inventory_items']['Row'];
type DbBranchInventory = Database['public']['Tables']['branch_inventory']['Row'];

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
    let hasErrors = false;
    console.log('Checking Supabase connection...');
    console.log(`Using project root: ${projectRoot}`);

    // Check Branches
    const { data: branches, error: errBranches } = await supabase
        .from('branches')
        .select('*');

    if (errBranches) {
        console.error('Error fetching branches:', errBranches);
        hasErrors = true;
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
        hasErrors = true;
    } else {
        const itemList = items as DbInventoryItem[] | null;
        console.log(`Inventory Items found: ${itemList?.length ?? 0}`);

        if (itemList && itemList.length > 0) {
            console.log('Sample Item:', itemList[0]);
        }

    }

    // Check Branch Inventory
    const { data: joinData, error: errJoin } = await supabase
        .from('branch_inventory')
        .select('*');

    if (errJoin) {
        console.error('Error fetching branch_inventory:', errJoin);
        hasErrors = true;
    } else {
        const joinList = joinData as DbBranchInventory[] | null;
        console.log(`Branch Inventory records found: ${joinList?.length ?? 0}`);
    }

    if (hasErrors) {
        console.error('❌ One or more database checks failed.');
        process.exit(1);
    }
}

check().catch((err: unknown) => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
