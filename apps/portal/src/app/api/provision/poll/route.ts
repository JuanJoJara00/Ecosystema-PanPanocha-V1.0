import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    // Mock: Automatic Approval for MVP Testing
    // In production, this would check if the user scanned the QR and approved it.

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
        return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    // Generate a dummy JWT token for the device
    // Payload needs: sub (device_id), organization_id, exp
    const payload = JSON.stringify({
        sub: 'dev_mock_' + Math.floor(Math.random() * 1000),
        organization_id: 'org_default_mock',
        exp: Math.floor(Date.now() / 1000) + 3600 * 24 // 24 hours
    });

    // Simple Base64Url encoding
    const b64Payload = Buffer.from(payload).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${b64Payload}.mock_signature`;

    return NextResponse.json({
        status: 'approved',
        auth_token: token,
        organization_id: 'org_default_mock'
    }, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    });
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
