import { NextResponse } from 'next/server';
import { verifyHmacSignature } from '@/lib/security';
import { createClient } from '@supabase/supabase-js';

// Inicializar cliente Admin para bypass de RLS (necesario para webhooks sin sesión de usuario)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

const WEBHOOK_SECRET = process.env.RAPPI_WEBHOOK_SECRET;

export async function POST(request: Request) {
    console.log('[Rappi Webhook] Received request');

    // 0. Verificar Variable de Entorno Crítica
    if (!WEBHOOK_SECRET) {
        console.error('[Rappi Webhook] CRITICAL: RAPPI_WEBHOOK_SECRET is not defined');
        return NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 });
    }

    try {
        // 1. Obtener el cuerpo crudo para la verificación de firma
        const rawBody = await request.text();

        // 2. Extraer firma de los headers (Rappi puede usar validation-token o x-webhook-signature)
        const signature = request.headers.get('validation-token') || request.headers.get('x-webhook-signature');

        // 3. Verificación de Seguridad
        if (!verifyHmacSignature(rawBody, signature, WEBHOOK_SECRET)) {
            console.warn('[Rappi Webhook] Invalid Signature Attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 4. Parseo seguro del cuerpo
        const payload = JSON.parse(rawBody);
        const rappiOrderId = payload.order_id || payload.id;

        if (!rappiOrderId) {
            console.warn('[Rappi Webhook] Invalid Payload - Missing Order ID');
            return NextResponse.json({ error: 'Invalid Payload' }, { status: 400 });
        }

        // 5. Idempotencia: Verificar si ya procesamos esta orden
        // Consultamos la tabla 'orders' o una tabla de log de eventos 'webhook_events'
        // Como 'webhook_events' no existe en el esquema compartido, usaremos la lógica de orders si es posible,
        // o asumiremos que el OrderService (implementado en Paso 2) manejará esto.
        // POR AHORA (PASO 1): Logueamos y hacemos un chequeo simple de 'orders' si es una orden nueva.

        // NOTA: En el Paso 2 implementaremos OrderService. 
        // Aquí hacemos un parche "inline" para cumplir el objetivo de seguridad inmediatamente.

        // Simulación de check de idempotencia via DB
        const { data: existingOrder } = await supabaseAdmin
            .from('orders') // Asumiendo que eventualmente guardamos el rappi_id en orders o en una tabla relacionada
            .select('id')
            .eq('source_ref', rappiOrderId) // Asumimos un campo source_ref o metadata
            .maybeSingle();

        if (existingOrder) {
            console.log(`[Rappi Webhook] Order ${rappiOrderId} already processed.`);
            return NextResponse.json({ status: 'ok', message: 'Already processed' });
        }

        // 6. Procesar el evento (Aquí iría la lógica de OrderService)
        // Por ahora, solo logueamos éxito de seguridad.
        console.log(`[Rappi Webhook] Verified Order ${rappiOrderId}. Ready for processing.`);

        // TODO: En Paso 2, llamar a: await orderService.createFromRappiWebhook(payload);

        return NextResponse.json({ status: 'ok' });

    } catch (error: any) {
        console.error('[Rappi Webhook] Processing Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
