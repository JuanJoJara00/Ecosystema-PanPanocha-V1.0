
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize a client specifically for this request context
// We use the standard supabase-js here because we want to manually set the Auth header
// derived from the request, rather than relying on cookies.
const createRouteClient = (token: string) => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            global: {
                headers: {
                    Authorization: token,
                },
            },
        }
    );
};

// Initialize admin client for bypassing RLS
const createAdminClient = () => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    // Key validated below

    if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing from server environment');
    }

    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branch_id');
        const authHeader = request.headers.get('authorization');

        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // For GET, we can still use the user context/admin depending on security needs.
        // If data is public/shared for authenticated users, user context is fine.
        // Switching to Admin client to ensure POS always gets data regardless of strict RLS.
        const supabase = createAdminClient();

        // Validate Token even if using Admin Client
        const userClient = createRouteClient(authHeader);
        const { error: authError } = await userClient.auth.getUser();
        if (authError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }


        // Parallel fetch for efficiency
        const [
            { data: products },
            { data: profiles },
            { data: branches },
            { data: tables },
            { data: expenses },
            { data: sales }
        ] = await Promise.all([
            // 1. Products (All active)
            supabase.from('products').select('*').eq('active', true),

            // 2. Profiles (Staff)
            supabase.from('profiles').select('id, email, full_name, role'),

            // 3. Branches (Reference)
            supabase.from('branches').select('*'),

            // 4. Tables (If branch specified)
            branchId
                ? supabase.from('tables').select('*').eq('branch_id', branchId)
                : Promise.resolve({ data: [] }),

            // 5. Recent Expenses (Last 60 days)
            supabase.from('expenses').select('*').order('created_at', { ascending: false }).limit(500),

            // 6. Recent Sales (Last 60 days, with Items)
            supabase.from('sales')
                .select('*, items:sale_items(*)')
                .order('created_at', { ascending: false })
                .limit(200)
        ]);

        return NextResponse.json({
            products: products || [],
            profiles: profiles || [],
            branches: branches || [],
            tables: tables || [],
            expenses: expenses || [],
            sales: sales || []
        });

    } catch (e: any) {
        console.error('Sync GET Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const authHeader = request.headers.get('authorization');

        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
        }

        // 1. Validate User (Use User Context)
        const userClient = createRouteClient(authHeader);
        const { data: { user }, error: authError } = await userClient.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        // Initialize Admin Client for Data Operations (Bypass RLS)
        const supabase = createAdminClient();

        // 2. Extract Data
        const {
            shifts = [],
            sales = [],
            expenses = [],
            orders = [], // NEW: Handle Active Orders
            deliveries = [] // NEW: Handle Deliveries
        } = body;

        const branchId = body.branch_id;

        if (!branchId) {
            return NextResponse.json({ error: 'Missing branch_id in payload' }, { status: 400 });
        }


        // 3. Validate Branch Existence
        const { data: branch, error: branchError } = await supabase
            .from('branches')
            .select('id')
            .eq('id', branchId)
            .single();

        if (branchError || !branch) {
            console.warn(`[SYNC WARNING] Branch ${branchId} verification failed or not found. Proceeding anyway per user request.`);
            // NON-BLOCKING: Proceeding to attempt sync even if branch check fails
        }

        const results = {
            shifts: { success: 0, failed: 0, errors: [] as any[] },
            sales: { success: 0, failed: 0, errors: [] as any[] },
            expenses: { success: 0, failed: 0, errors: [] as any[] },
            orders: { success: 0, failed: 0, errors: [] as any[] },
            deliveries: { success: 0, failed: 0, errors: [] as any[] }
        };

        // 4. Process Shifts
        if (shifts.length > 0) {
            const { error } = await supabase.from('shifts').upsert(shifts);
            if (error) {
                results.shifts.failed = shifts.length;
                results.shifts.errors.push(error);
                console.error("Sync Shifts Error:", error);
            } else {
                results.shifts.success = shifts.length;
            }
        }

        // 5. Process Sales
        const cleanSales = sales.map((s: any) => ({
            ...s,
            branch_id: branchId
        }));

        if (cleanSales.length > 0) {
            const { error } = await supabase.from('sales').upsert(cleanSales);
            if (error) {
                results.sales.failed = cleanSales.length;
                results.sales.errors.push(error);
                console.error("Sync Sales Error:", error);
            } else {
                results.sales.success = cleanSales.length;
            }
        }

        // 6. Process Expenses
        const cleanExpenses = expenses.map((e: any) => ({
            ...e,
            branch_id: branchId
        }));

        if (cleanExpenses.length > 0) {
            const { error } = await supabase.from('expenses').upsert(cleanExpenses);
            if (error) {
                results.expenses.failed = cleanExpenses.length;
                results.expenses.errors.push(error);
            } else {
                results.expenses.success = cleanExpenses.length;
            }
        }

        // 7. Process Orders (Active Tables / Pending)
        // These are typically transient, but we sync them to let Portal know status
        if (orders.length > 0) {
            const cleanOrders = orders.map((o: any) => ({
                ...o,
                branch_id: branchId
            }));
            const { error } = await supabase.from('orders').upsert(cleanOrders);
            if (error) {
                results.orders.failed = cleanOrders.length;
                results.orders.errors.push(error);
            } else {
                results.orders.success = cleanOrders.length;
            }
        }

        // 8. Process Deliveries
        if (deliveries.length > 0) {
            const cleanDeliveries = deliveries.map((d: any) => ({
                ...d,
                branch_id: branchId
            }));
            const { error } = await supabase.from('deliveries').upsert(cleanDeliveries);
            if (error) {
                results.deliveries.failed = cleanDeliveries.length;
                results.deliveries.errors.push(error);
            } else {
                results.deliveries.success = cleanDeliveries.length;
            }
        }


        return NextResponse.json({
            success: true,
            results,
            message: "Sync processed"
        });

    } catch (e: any) {
        console.error('Sync Endpoint Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
