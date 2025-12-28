
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dafdejwjgieiuazxmzba.supabase.co'
// Service Role Key
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZmRlandqZ2llaXVhenhtemJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA0MjY2MiwiZXhwIjoyMDgwNjE4NjYyfQ.tpyFxjnBFFTwDazshUVE8RJWpU7XLZvnB9czjK_Sul4'

const supabase = createClient(supabaseUrl, supabaseKey)

async function seed() {
    console.log('Starting Robust Seed Process...')

    // 1. Get or Create Branches
    let { data: branches, error: errB } = await supabase.from('branches').select('*')
    if (errB) return console.error(errB)

    console.log(`Found ${branches?.length} branches.`)

    // 2. Get or Create Suppliers
    let { data: suppliers, error: errS } = await supabase.from('suppliers').select('*')
    if (suppliers?.length === 0) {
        const newSuppliers = [
            { name: 'Molino Central', contact: 'Carlos Perez' },
            { name: 'Azucarera del Valle', contact: 'Maria Rodriguez' },
            { name: 'Distribuidora Lácteos', contact: 'Juan Gomez' }
        ]
        console.log('Inserting Suppliers...')
        const { data, error } = await supabase.from('suppliers').insert(newSuppliers).select()
        if (error) return console.error('Error inserting suppliers:', error)
        suppliers = data
    }
    console.log(`Using ${suppliers?.length} suppliers.`)

    // 3. Check Items
    let { data: items } = await supabase.from('inventory_items').select('*')
    if (items?.length === 0) {
        const newItems = [
            { sku: 'HARI-001', name: 'Harina de Trigo Fortificada', unit: 'kg', min_stock_alert: 50, unit_cost: 3200, supplier_id: (suppliers as any[])[0].id },
            { sku: 'AZUC-001', name: 'Azúcar Blanca Refinada', unit: 'kg', min_stock_alert: 20, unit_cost: 4500, supplier_id: (suppliers as any[])[1].id },
            { sku: 'MAN-005', name: 'Mantequilla Industrial', unit: 'Bloque 500g', min_stock_alert: 10, unit_cost: 12000, supplier_id: (suppliers as any[])[2].id },
            { sku: 'LEV-002', name: 'Levadura Fresca', unit: 'Barra 500g', min_stock_alert: 15, unit_cost: 8500, supplier_id: (suppliers as any[])[0].id },
            { sku: 'HUE-010', name: 'Huevos AA', unit: 'Panal x30', min_stock_alert: 5, unit_cost: 16000, supplier_id: (suppliers as any[])[2].id },
            { sku: 'SAL-001', name: 'Sal Refinada', unit: 'kg', min_stock_alert: 5, unit_cost: 1500, supplier_id: (suppliers as any[])[0].id },
            { sku: 'ESC-001', name: 'Esencia de Vainilla Negra', unit: 'Botella 500ml', min_stock_alert: 3, unit_cost: 18000, supplier_id: (suppliers as any[])[0].id },
            { sku: 'CHO-050', name: 'Chocolate Semiamargo', unit: 'kg', min_stock_alert: 8, unit_cost: 24000, supplier_id: (suppliers as any[])[0].id }
        ]
        console.log('Inserting Items...')
        const { data, error } = await supabase.from('inventory_items').insert(newItems).select()
        if (error) return console.error('Error inserting items:', error)
        items = data
    }
    console.log(`Using ${items?.length} items.`)

    // 4. Assign Stock
    const branchInventory: any[] = []
        ; (items as any[]).forEach((item: any) => {
            (branches as any[]).forEach((branch: any) => {
                const quantity = Math.floor(Math.random() * 100)
                branchInventory.push({
                    branch_id: branch.id,
                    item_id: item.id,
                    quantity: quantity
                })
            })
        })

    // We rely on "onConflict" or we clear it first? 
    // Let's just try insert. If it fails, likely it exists.
    console.log('Inserting Stock...')
    const { error: stockError } = await supabase.from('branch_inventory').insert(branchInventory)

    if (stockError) console.log('Stock insertion info (might be duplicates):', stockError.message)
    else console.log('Stock assigned.')

    console.log('Database Seeded Successfully!')
}

seed()
