import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const PinLoginSchema = z.object({
    pin: z.string().min(4).max(6)
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parse = PinLoginSchema.safeParse(body);

        if (!parse.success) {
            return NextResponse.json({ error: 'Formato de PIN inválido' }, { status: 400 });
        }

        const { pin } = parse.data;

        // Init Admin Client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // DIAGNOSTIC 1: Check general connectivity
        const { error: healthCheckError } = await supabaseAdmin.from('provisioning_sessions').select('id').limit(1);

        if (healthCheckError) {
            console.error('Health Check Failed:', healthCheckError);
            return NextResponse.json({
                error: 'Service Role Key cannot access Database (Health Check Failed)',
                details: healthCheckError,
                debug_key_prefix: supabaseServiceKey.slice(-6)
            }, { status: 500 });
        }

        // 1. Find User by PIN
        // We use the admin client to bypass RLS and find the user
        const { data: users, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('pin_code', pin)
            .eq('active', true);

        if (userError) {
            console.error('Database Error:', userError);
            return NextResponse.json({
                error: 'Error verificando credenciales',
                details: userError,
                hint: userError.hint,
                // Debug Info
                debug_key_prefix: supabaseServiceKey.slice(-6), // Suffix is distinct (Anon vs Service)
                debug_is_valid_jwt: supabaseServiceKey.startsWith('ey')
            }, { status: 500 });
        }

        if (!users || users.length === 0) {
            return NextResponse.json({ error: 'PIN incorrecto o usuario inactivo' }, { status: 401 });
        }

        // Handle multiple users with same PIN?
        // For '0000', we might have clashes. We prioritise 'owner' role or just take the first one.
        // Ideally, we'd warn, but for now we take the first valid one.
        const pinUser = users[0];

        if (!pinUser.organization_id) {
            return NextResponse.json({ error: 'El usuario no tiene una organización asignada' }, { status: 403 });
        }

        // 2. Provision a "Device Session" for this Login
        // We don't sign in AS the user (requires password). 
        // We create a fresh Device User linked to their Organization.
        // This ensures the POS gets the correct Data Sync scope.

        const timestamp = Date.now();
        const fingerprint = `pin_login_${pinUser.id.substring(0, 8)}`;
        const deviceEmail = `device_${fingerprint}_${timestamp}@panpanocha.com`;
        const devicePassword = `pos-${fingerprint}-secure`; // Auto-generated secure password

        // Create the Device User
        const { error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: deviceEmail,
            password: devicePassword,
            email_confirm: true,
            user_metadata: {
                full_name: `${pinUser.full_name} (POS Device)`,
                role: 'pos_device',
                organization_id: pinUser.organization_id, // CRITICAL: Link to User's Org
                linked_user_id: pinUser.id // Track which user authorized this
            }
        });

        if (createError && !createError.message.includes('already registered')) {
            console.error('Failed to create device user:', createError);
            return NextResponse.json({ error: 'Error iniciando sesión de dispositivo' }, { status: 500 });
        }

        // Sign In
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
            email: deviceEmail,
            password: devicePassword
        });

        if (signInError || !signInData.session) {
            console.error('Sign In Failed:', signInError);
            return NextResponse.json({ error: 'Error autenticando dispositivo' }, { status: 500 });
        }

        // 3. Return Success
        return NextResponse.json({
            status: 'success',
            auth_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
            user: {
                id: pinUser.id,
                full_name: pinUser.full_name,
                role: pinUser.role,
                organization_id: pinUser.organization_id,
                branch_id: pinUser.branch_id // Return assigned branch or null (for owners)
            }
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            }
        });

    } catch (e: any) {
        console.error('PIN Login API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
