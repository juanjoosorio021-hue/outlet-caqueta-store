import { createClient } from '@supabase/supabase-js';
import { createHash, timingSafeEqual } from 'node:crypto';

export const sha256 = s => createHash('sha256').update(s).digest('hex');
// Firma de integridad oficial de Wompi: SHA-256 de <referencia><monto en centavos><moneda><secreto de integridad>
export const integritySignature = (reference, cents, currency, secret) => sha256(`${reference}${cents}${currency}${secret}`);

export function admin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}
// WOMPI_ENV=sandbox usa las llaves WOMPI_SANDBOX_*; cualquier otro valor usa producción.
export function wompiKeys() {
  const sandbox = (process.env.WOMPI_ENV || 'production').toLowerCase() === 'sandbox';
  return sandbox
    ? { sandbox, pub: process.env.WOMPI_SANDBOX_PUBLIC_KEY, integrity: process.env.WOMPI_SANDBOX_INTEGRITY_SECRET }
    : { sandbox, pub: process.env.WOMPI_PUBLIC_KEY, integrity: process.env.WOMPI_INTEGRITY_SECRET };
}
export const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
