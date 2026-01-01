import { NextResponse } from 'next/server';

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

export async function POST() {
    // Mock Session Generation for MVP
    const sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
    // qr_url matches what QRCodeSVG expects (any string, usually a URL)
    const qrUrl = `https://portal.panpanocha.com/link?session=${sessionId}`;

    return NextResponse.json({
        session_id: sessionId,
        qr_url: qrUrl,
        expires_at: new Date(Date.now() + 10 * 60000).toISOString() // 10 mins
    }, {
        headers: {
            'Access-Control-Allow-Origin': '*',
        }
    });
}
