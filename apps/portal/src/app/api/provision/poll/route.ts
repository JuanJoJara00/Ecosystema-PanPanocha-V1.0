import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
        return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    // Init Admin Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase Configuration');
        return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Check Session Status in DB
    const { data: sessionData, error: sessionError } = await supabaseAdmin
        .from('provisioning_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

    if (sessionError || !sessionData) {
        // If session not found, return pending or error
        // For debugging MVP, we assume if ID exists locally it exists remotely
        return NextResponse.json({ status: 'pending' }, { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    // 2. AUTO-APPROVE Logic (for MVP Testing)
    if (sessionData.status === 'pending') {
        // Create/Get a "Device User" for this POS
        // We use the fingerprint or session ID to create a unique email
        // We append a timestamp to ensure we always get a FRESH user and avoid '403 Forbidden' from stale/unconfirmed accounts.
        const deviceEmail = `device_${sessionData.fingerprint.substring(0, 8)}_${Date.now()}@panpanocha.com`;
        const devicePassword = `pos-${sessionData.fingerprint.substring(0, 8)}-secure`;

        // Check if user exists or create
        // We can't check explicitly easily without listing, so we try signUp (if allow) or admin.createUser
        let authData;

        // Try to Create User
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: deviceEmail,
            password: devicePassword,
            email_confirm: true,
            user_metadata: {
                full_name: sessionData.device_name || 'POS Device',
                role: 'pos_device',
                // Use the Org ID from the provisioning session (assigned by Owner approval), fallback for safety
                organization_id: sessionData.organization_id || 'org_default'
            }
        });

        if (createError) {
            console.log(`[Provision] User creation result: ${createError.message}. Attempting login...`);
            // If user already exists, we sign in
        }

        // Sign In to get Token
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
            email: deviceEmail,
            password: devicePassword
        });

        if (signInError || !signInData.session) {
            console.error('[Provision] Failed to sign in device user:', signInError);
            return NextResponse.json({ error: 'Auth Generation Failed' }, { status: 500 });
        }

        // 3. Mark Session Approved and Store Token Hash (optional, for security we shouldn't store plain token)
        // But here we return it to the client.
        await supabaseAdmin
            .from('provisioning_sessions')
            .update({
                status: 'approved',
                auth_token_hash: 'delivered' // Don't store actual token if possible
            })
            .eq('id', sessionId);

        return NextResponse.json({
            status: 'approved',
            auth_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
            organization_id: 'org_default'
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        });
    }

    return NextResponse.json({ status: sessionData.status });
}

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
