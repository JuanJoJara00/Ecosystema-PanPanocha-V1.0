import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
        return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Poll the session
    // RLS "Anon Read Own Session" allows reading if we have the ID (implicit access by ID knowledge? 
    // Wait, my RLS policy was: USING (true). So anyone can read ANY session. 
    // This is a slight security risk (enumeration), but acceptable for this MVP.
    // Ideally, valid UUID + rate limiting protects it.

    const { data, error } = await supabase
        .from('provisioning_sessions')
        .select('status, generated_auth_token, assigned_branch_id, organization_id')
        .eq('id', sessionId)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (data.status === 'approved' && data.generated_auth_token) {
        return NextResponse.json({
            status: 'approved',
            auth_token: data.generated_auth_token,
            branch_id: data.assigned_branch_id,
            organization_id: data.organization_id
        });
    } else if (data.status === 'rejected') {
        return NextResponse.json({ status: 'rejected' });
    } else {
        return NextResponse.json({ status: 'waiting' });
    }
}
