import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SignJWT, importPKCS8 } from 'jose';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing Authorization Header' }, { status: 401 });
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return NextResponse.json({ error: 'Invalid Authorization Header Format' }, { status: 401 });
        }
        const token = parts[1];
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[PowerSync] Missing Supabase Config');
            return NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 });
        }

        // Verify Supabase Token
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('[PowerSync] Invalid User Token:', error);
            return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
        }

        // Generate PowerSync Token
        const powerSyncUrl = process.env.POWERSYNC_URL;
        const privateKeyPEM = process.env.POWERSYNC_PRIVATE_KEY;

        if (!powerSyncUrl || !privateKeyPEM) {
            console.error('[PowerSync] Missing PowerSync Keys');
            return NextResponse.json({ error: 'PowerSync Config Missing' }, { status: 500 });
        }

        const privateKey = await importPKCS8(privateKeyPEM, 'EdDSA');

        // PowerSync JWT
        const psToken = await new SignJWT({})
            .setProtectedHeader({ alg: 'EdDSA' })
            .setIssuedAt()
            .setIssuer('supabase-powersync')
            .setAudience(powerSyncUrl)
            .setExpirationTime('1h')
            .setSubject(user.id)
            .sign(privateKey);

        return NextResponse.json({
            token: psToken,
            endpoint: powerSyncUrl
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });

    } catch (e) {
        console.error("[PowerSync] Token Generation Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
