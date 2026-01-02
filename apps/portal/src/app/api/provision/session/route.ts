import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const SessionSchema = z.object({
    fingerprint: z.string().min(1),
    device_name: z.string().optional(),
    device_type: z.string().optional()
});

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parse = SessionSchema.safeParse(body);

        if (!parse.success) {
            return NextResponse.json({ error: 'Invalid payload' }, {
                status: 400,
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        const { fingerprint, device_name, device_type } = parse.data;

        // Init Admin Client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
            return NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Insert Session
        const { data, error } = await supabaseAdmin
            .from('provisioning_sessions')
            .insert({
                fingerprint,
                device_name: device_name || 'Unknown Device',
                device_type: device_type || 'pos',
                ip_address: '127.0.0.1', // Mock IP for dev
                status: 'pending',
                expires_at: new Date(Date.now() + 10 * 60000).toISOString()
            })
            .select('id')
            .single();

        if (error) {
            console.error('Failed to create session:', error);
            return NextResponse.json({ error: 'Database Error' }, { status: 500 });
        }

        const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/link?session=${data.id}`;

        return NextResponse.json({
            session_id: data.id,
            qr_url: qrUrl,
            expires_at: new Date(Date.now() + 10 * 60000).toISOString()
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });

    } catch (e) {
        console.error('Session API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
