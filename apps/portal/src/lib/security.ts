import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifica la firma HMAC-SHA256 de un payload de manera segura contra ataques de tiempo.
 * @param rawBody - El cuerpo crudo de la solicitud (string o Buffer)
 * @param signature - La firma recibida en el header
 * @param secret - La clave secreta compartida (variable de entorno)
 */
export function verifyHmacSignature(rawBody: string | Buffer, signature: string | null, secret: string): boolean {
    if (!signature || !secret) {
        console.error('[Security] Missing signature or secret for HMAC verification');
        return false;
    }

    try {
        // 1. Calcular el hash esperado usando el secreto y el cuerpo
        const hmac = createHmac('sha256', secret);
        const digest = hmac.update(rawBody).digest('hex');

        // 2. Preparar buffers para comparación de tiempo constante
        const signatureBuffer = Buffer.from(signature);
        const digestBuffer = Buffer.from(digest);

        // 3. Verificar longitud antes de comparar (requisito de timingSafeEqual)
        if (signatureBuffer.length !== digestBuffer.length) {
            return false;
        }

        // 4. Comparación segura de tiempo constante
        return timingSafeEqual(signatureBuffer, digestBuffer);
    } catch (error) {
        console.error('[Security] Error verifying signature:', error);
        return false;
    }
}

/**
 * Genera un token aleatorio seguro (hex)
 * @param length Longitud en bytes (el string resultante será el doble de largo)
 */
export function generateSecureToken(length: number = 32): string {
    const { randomBytes } = require('crypto');
    return randomBytes(length).toString('hex');
}
