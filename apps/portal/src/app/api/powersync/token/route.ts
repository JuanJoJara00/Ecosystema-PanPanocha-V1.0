import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SignJWT, importPKCS8, base64url } from 'jose';

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];

// Initialize Rate Limiter
// Allow 10 requests per 10 seconds per identifier
const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "10 s"),
    analytics: true,
    prefix: "@panpanocha/ratelimit",
});

function getCorsHeaders(request: Request) {
    const origin = request.headers.get('origin') || '';
    const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}

export async function OPTIONS(request: Request) {
    return NextResponse.json({}, { headers: getCorsHeaders(request) });
}

export async function GET(request: Request) {
    try {
        const corsHeaders = getCorsHeaders(request);

        // Rate Limiting
        // Rate Limiting
        const authHeader = request.headers.get('Authorization');
        const tokenPart = authHeader?.split(' ')[1];

        let identifier: string;

        if (tokenPart) {
            // Hash the token to avoid storing raw secrets in Redis/Logs
            identifier = `token:${createHash('sha256').update(tokenPart).digest('hex')}`;
        } else {
            // Robust IP extraction
            const forwardedFor = request.headers.get("x-forwarded-for");
            const ipRaw = forwardedFor ? forwardedFor.split(',')[0] : "unknown";
            identifier = `ip:${ipRaw.trim().toLowerCase()}`;
        }

        const { success, limit, reset, remaining } = await ratelimit.limit(identifier);

        if (!success) {
            return NextResponse.json({ error: 'Too Many Requests' }, {
                status: 429,
                headers: {
                    ...corsHeaders,
                    'X-RateLimit-Limit': limit.toString(),
                    'X-RateLimit-Remaining': remaining.toString(),
                    'X-RateLimit-Reset': reset.toString(),
                    'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString()
                }
            });
        }

        if (!authHeader) {
            return NextResponse.json({ error: 'Missing Authorization Header' }, { status: 401, headers: corsHeaders });
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return NextResponse.json({ error: 'Invalid Authorization Header Format' }, { status: 401, headers: corsHeaders });
        }
        const token = parts[1];
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[PowerSync] Missing Supabase Config');
            return NextResponse.json({ error: 'Server Configuration Error' }, { status: 500, headers: corsHeaders });
        }

        // Verify Supabase Token
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            }
        });

        let user;

        // DEV OVERRIDE: Allow Mock Tokens from Provisioning Mock
        const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
        if (isDev && token.includes('.mock_signature')) {
            console.warn('[PowerSync] ⚠️ Development Mode: Accepting Mock Token');
            try {
                // Manually decode payload without verification
                const payloadPart = token.split('.')[1];
                const cleanPayload = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
                const decoded = Buffer.from(cleanPayload, 'base64').toString();
                const payload = JSON.parse(decoded);

                // Create minimal user object
                user = {
                    id: payload.sub,
                    aud: 'authenticated',
                    role: 'authenticated'
                };
            } catch (e) {
                console.error('[PowerSync] Failed to parse mock token:', e);
            }
        }

        if (!user) {
            const { data: { user: realUser }, error } = await supabase.auth.getUser(token);
            if (error || !realUser) {
                console.error('[PowerSync] Invalid User Token:', error);
                return NextResponse.json({ error: 'Invalid Token' }, { status: 401, headers: corsHeaders });
            }
            user = realUser;
        }

        // Generate PowerSync Token
        const powerSyncUrl = process.env.POWERSYNC_URL;

        // Use Secret (HS256) instead of Private Key (RS256/EdDSA)
        const jwtSecret = process.env.POWERSYNC_JWT_SECRET; // This replaces POWERSYNC_PRIVATE_KEY

        if (!powerSyncUrl || !jwtSecret) {
            console.error('[PowerSync] Missing PowerSync Keys or Secret');
            return NextResponse.json({ error: 'PowerSync Config Missing' }, { status: 500, headers: corsHeaders });
        }

        // PowerSync JWT with HS256 (Shared Secret)
        // Dashboard treats the input as Base64URL, so we must decode it to matching bytes
        const secretBytes = base64url.decode(jwtSecret);

        // Fix 1: Add 'kid' to match Dashboard Configuration
        // Fix 2: Backdate 'iat' by 30s to handle Clock Skew between Portal & PowerSync Cloud
        const psToken = await new SignJWT({})
            .setProtectedHeader({ alg: 'HS256', kid: 'portal-secret' })
            .setIssuedAt(Math.floor(Date.now() / 1000) - 30)
            .setIssuer('supabase-powersync')
            .setAudience(powerSyncUrl)
            .setExpirationTime('1h')
            .setSubject(user.id)
            .sign(secretBytes);

        return NextResponse.json({
            token: psToken,
            endpoint: powerSyncUrl
        }, {
            headers: corsHeaders
        });

    } catch (e) {
        console.error("[PowerSync] Token Generation Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, {
            status: 500,
            headers: getCorsHeaders(request)
        });
    }
}
