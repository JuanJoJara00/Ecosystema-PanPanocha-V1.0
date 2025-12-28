
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ----------------------------------------------------------------------
// RAPPI WEBHOOK HANDLER (SCAFFOLD)
// ----------------------------------------------------------------------
// This route is designed to receive status updates or new orders from Rappi.
// Documentation: https://dev-portal.rappi.com/
//
// TODO: Secure this endpoint!
// 1. Verify the 'Validation-Token' or Signature header from Rappi if available.
// 2. Or use a secret query param ?token=MY_SECRET
// ----------------------------------------------------------------------

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const headers = request.headers

        console.log('--- RAPPI WEBHOOK RECEIVED ---')
        console.log('Headers:', Object.fromEntries(headers.entries()))
        console.log('Body:', JSON.stringify(body, null, 2))

        // ------------------------------------------------------------------
        // 1. VALIDATION (Placeholder)
        // ------------------------------------------------------------------
        // const authHeader = headers.get('authorization')
        // if (authHeader !== `Bearer ${process.env.RAPPI_CLIENT_SECRET}`) {
        //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        // }

        // ------------------------------------------------------------------
        // 2. PARSE EVENT TYPE
        // ------------------------------------------------------------------
        // Rappi payloads vary. Check if this is a new order creation event.
        // Example logic (adapt based on actual payload structure):
        const eventType = body.type || 'unknown'

        if (eventType === 'order.created' || body.order_id) {
            return await handleNewOrder(body)
        }

        // Return 200 OK so Rappi doesn't retry indefinitely
        return NextResponse.json({ message: 'Event received' }, { status: 200 })

    } catch (error: any) {
        console.error('Rappi Webhook Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

async function handleNewOrder(payload: any) {
    // ------------------------------------------------------------------
    // 3. MAP RAPPI DATA TO OUR SCHEMA
    // ------------------------------------------------------------------
    // Adapt these fields based on the actual JSON structure from Rappi's API
    const rappiOrderId = payload.order_id || payload.id

    // Default branch (or find by store_id match)
    // const storeId = payload.store_id
    // const { data: branch } = await supabase.from('branches').select('id').eq('rappi_store_id', storeId).single()

    const items = payload.items || []

    // Simplified product mapping
    const productDetails = items.map((item: any) => ({
        id: item.sku || 'unknown',
        name: item.name,
        quantity: item.quantity,
        price: item.price
    }))

    const totalValue = items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0)

    // ------------------------------------------------------------------
    // 4. INSERT INTO DATABASE
    // ------------------------------------------------------------------
    const { error } = await supabase
        .from('rappi_deliveries')
        .insert({
            rappi_order_id: rappiOrderId,
            status: 'pending',
            product_details: JSON.stringify(productDetails),
            total_value: totalValue,
            // branch_id: branch?.id, // Enable if branch mapping matches
            notes: `Rappi Auto-Import. Customer: ${payload.user?.first_name || 'N/A'}`
        })

    if (error) {
        console.error('Failed to save Rappi order:', error)
        throw error
    }

    return NextResponse.json({ message: 'Order created successfully' }, { status: 201 })
}
