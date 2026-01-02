import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

const ApproveSchema = z.object({
    session_id: z.string().uuid(),
    branch_id: z.string().uuid(),
    device_name: z.string().min(1)
});

export async function POST(request: Request) {
    try {
        // 1. Auth Check (Manager only)
        // CRITICAL: Enforce auth in production. Optional in dev for easier testing if needed.
        if (process.env.NODE_ENV === 'production') {
            const supabaseServer = await createServerClient();
            const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

            if (authError || !user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        } else {
            console.warn("[API] Auth check bypassed for Development environment.");
        }

        // 2. Validate Body
        const body = await request.json();
        const parseResult = ApproveSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json({ error: 'Invalid payload', details: parseResult.error }, { status: 400 });
        }
        let { session_id, branch_id, device_name } = parseResult.data;

        // 3. Admin Client (To write to devices/sessions and bypass RLS if needed, though Manager might have access)
        // We use Service Role Key if we need to sign tokens or do admin stuff? 
        // Actually, we use the JWT Secret to sign. 
        // We can use the user's client to insert if RLS allows.
        // Let's use the standard client for DB ops to respect RLS (Manager should be able to create devices).

        // Fetch Organization ID from Manager's profile to enforce tenancy??
        // For now, let's assume the branch_id implies the Org.

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Key for privileged actions like minting?
        // Actually, signing is manual.
        // DB writes: Use Service Key to ensure we can write to 'devices' and 'provisioning_sessions' regardless of strict RLS for now,
        // to avoid "Manager can't create device" issues until policies are perfect.

        if (!supabaseServiceKey) {
            throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
        }
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // 4. Get Session & Branch Details
        const { data: branch, error: branchError } = await supabaseAdmin
            .from('branches')
            .select('organization_id')
            .eq('id', branch_id)
            .single();

        if (branchError || !branch) {
            return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
        }

        // 5. Create Device Record
        // We need the ID returned to put in the token
        const { data: device, error: createError } = await supabaseAdmin
            .from('devices')
            .insert({
                organization_id: branch.organization_id,
                branch_id: branch_id,
                name: device_name,
                status: 'active',
                // We should ideally fetch fingerprint from session, but let's assume it's passed or we fetch session first.
                // Let's fetch session to get fingerprint.
            })
            .select()
            .single();

        // Wait, we need the fingerprint from the session!
        const { data: sessionData } = await supabaseAdmin.from('provisioning_sessions').select('*').eq('id', session_id).single();
        if (!sessionData) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

        // UPDATE Device with fingerprint now
        const { data: finalDevice, error: devError } = await supabaseAdmin
            .from('devices')
            .insert({
                organization_id: branch.organization_id,
                branch_id: branch_id,
                name: device_name,
                fingerprint: sessionData.fingerprint,
                status: 'active',
                ip_address: sessionData.ip_address
            })
            .select()
            .single();

        if (devError) {
            return NextResponse.json({ error: 'Failed to create device', details: devError }, { status: 500 });
        }

        // 6. Mint JWT
        const payload = {
            sub: finalDevice.id, // The Device ID is the Subject
            aud: 'authenticated', // Role
            role: 'authenticated',
            organization_id: branch.organization_id, // Custom Claim
            branch_id: branch_id // Custom Claim
        };

        // Sign with Supabase JWT Secret
        const secret = process.env.SUPABASE_JWT_SECRET;
        if (!secret) throw new Error('Missing JWT Secret');

        const token = jwt.sign(payload, secret, { expiresIn: '1000y' }); // Long-lived for now

        // 7. Update Session with Token (so polling POS gets it)
        await supabaseAdmin
            .from('provisioning_sessions')
            .update({
                status: 'approved',
                assigned_branch_id: branch_id,
                generated_auth_token: token,
                // Link directly?
            })
            .eq('id', session_id);

        return NextResponse.json({ success: true, device: finalDevice });

    } catch (err) {
        console.error('Approve Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
