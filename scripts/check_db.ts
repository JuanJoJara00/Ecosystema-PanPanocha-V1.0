
// @ts-nocheck
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load env from apps/portal/.env.local
dotenv.config({ path: path.resolve(__dirname, '../apps/portal/.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.log('Missing env vars:', { supabaseUrl, hasKey: !!supabaseKey })
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log('Checking Supabase connection...')

    // Check Branches
    const { data: branches, error: errBranches } = await supabase.from('branches').select('*')
    if (errBranches) console.error('Error fetching branches:', errBranches)
    else console.log(`Branches found: ${branches.length}`, branches)

    // Check Items
    const { data: items, error: errItems } = await supabase.from('inventory_items').select('*')
    if (errItems) console.error('Error fetching inventory_items:', errItems)
    else console.log(`Inventory Items found: ${items.length}`)

    if (items && items.length > 0) {
        console.log('Sample Item:', items[0])

        // Check Branch Inventory join
        const { data: joinData, error: errJoin } = await supabase
            .from('branch_inventory')
            .select('*')

        if (errJoin) console.error('Error fetching branch_inventory:', errJoin)
        else console.log(`Branch Inventory records found: ${joinData.length}`)
    }
}

check()
