
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dafdejwjgieiuazxmzba.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZmRlandqZ2llaXVhenhtemJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNDI2NjIsImV4cCI6MjA4MDYxODY2Mn0.S9vZtPjkT4mPqJESsCKUTVZZHay6FpbnB0jIw4pQ6jE'

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
    else {
        console.log(`Inventory Items found: ${items.length}`)
        if (items.length === 0) {
            console.log('Use Seed Script to populate data!')
        }
    }

    if (items && items.length > 0) {
        // Check Branch Inventory join
        const { data: joinData, error: errJoin } = await supabase
            .from('branch_inventory')
            .select('*')

        if (errJoin) console.error('Error fetching branch_inventory:', errJoin)
        else console.log(`Branch Inventory records found: ${joinData.length}`)
    }
}

check()
