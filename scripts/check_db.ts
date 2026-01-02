/**
 * Database check script for Supabase connection verification.
 * Run with: npx ts-node scripts/check_db.ts
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from apps/portal/.env.local
dotenv.config({ path: path.resolve(__dirname, '../apps/portal/.env.local') });

// Type definitions for Supabase tables
interface Branch {
    id: string;
    organization_id: string;
    name: string;
    city?: string;
    address?: string;
    phone?: string;
    created_at?: string;
}

interface InventoryItem {
    id: string;
    organization_id: string;
    name: string;
    sku?: string;
    category?: string;
    unit?: string;
    cost_price?: number;
    created_at?: string;
}

interface BranchInventory {
    id?: string;
    branch_id: string;
    item_id: string;
    quantity: number;
    last_updated?: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.log('Missing env vars:', { supabaseUrl, hasKey: !!supabaseKey });
    process.exit(1);
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

async function check(): Promise<void> {
    console.log('Checking Supabase connection...');

    // Check Branches
    const { data: branches, error: errBranches } = await supabase
        .from('branches')
        .select('*');

    if (errBranches) {
        console.error('Error fetching branches:', errBranches);
    } else {
        const branchList = branches as Branch[] | null;
        console.log(`Branches found: ${branchList?.length ?? 0}`, branchList);
    }

    // Check Items
    const { data: items, error: errItems } = await supabase
        .from('inventory_items')
        .select('*');

    if (errItems) {
        console.error('Error fetching inventory_items:', errItems);
    } else {
        const itemList = items as InventoryItem[] | null;
        console.log(`Inventory Items found: ${itemList?.length ?? 0}`);

        if (itemList && itemList.length > 0) {
            console.log('Sample Item:', itemList[0]);

            // Check Branch Inventory join
            const { data: joinData, error: errJoin } = await supabase
                .from('branch_inventory')
                .select('*');

            if (errJoin) {
                console.error('Error fetching branch_inventory:', errJoin);
            } else {
                const joinList = joinData as BranchInventory[] | null;
                console.log(`Branch Inventory records found: ${joinList?.length ?? 0}`);
            }
        }
    }
}

check().catch((err: unknown) => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
