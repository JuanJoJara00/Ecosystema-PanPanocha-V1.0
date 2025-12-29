import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { InitProvisioningPayload } from '@panpanocha/types'; // Assuming this export exists
import { z } from 'zod';

// Zod Schema for Validation
const InitSchema = z.object({
    fingerprint: z.string().min(1),
    device_name: z.string().min(1),
    ip_address: z.string().optional()
});

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. Validate Input
        const parseResult = InitSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json({ error: 'Invalid payload', details: parseResult.error }, { status: 400 });
        }
        const { fingerprint, device_name, ip_address } = parseResult.data;

        // 2. Initialize Supabase Admin Client (To bypass RLS if needed, or just standard client)
        // Actually, our SQL policy "Anon Create Session" allows public INSERT.
        // So we can use the public anon key.
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // 3. Create Session
        const { data, error } = await supabase
            .from('provisioning_sessions')
            .insert({
                fingerprint,
                device_name,
                ip_address,
                status: 'waiting'
            })
            .select('id, expires_at, status')
            .single();

        if (error) {
            console.error('Provisioning Session Creation Error:', error);
            return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
        }

        return NextResponse.json({
            session_id: data.id,
            expires_at: data.expires_at,
            status: data.status,
            qr_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/portal/admin/devices/approve?session=${data.id}`
        });

    } catch (err) {
        console.error('API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
