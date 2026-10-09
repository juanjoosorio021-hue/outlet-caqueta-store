// Pedidos y pagos para el administrador (protegido con ADMIN_PUBLISH_TOKEN).
import { admin, same } from '../_lib.js';

const ESTADOS = ['Recibido', 'En preparación', 'Enviado', 'Entregado', 'Cancelado'];

export default async function handler(req, res) {
  const sb = admin(), want = process.env.ADMIN_PUBLISH_TOKEN;
  if (!sb || !want) return res.status(500).json({ error: 'Falta configurar ADMIN_PUBLISH_TOKEN o SUPABASE_SERVICE_ROLE_KEY en Vercel.' });
  const got = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!got || !same(got, want)) return res.status(401).json({ error: 'Clave de publicación incorrecta.' });

  if (req.method === 'GET') {
    const { data, error } = await sb.from('orders').select('*,order_items(*)').order('created_at', { ascending: false }).limit(200);
    if (error) return res.status(500).json({ error: 'No se pudieron leer los pedidos. ¿Ejecutó pagos.sql?' });
    return res.status(200).json({ orders: data || [] });
  }
  if (req.method === 'POST') {
    const { id, order_status } = req.body || {};
    if (!id || !ESTADOS.includes(order_status)) return res.status(400).json({ error: 'Datos inválidos.' });
    const { error } = await sb.from('orders').update({ order_status }).eq('id', id);
    if (error) return res.status(500).json({ error: 'No se pudo actualizar.' });
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'Método no permitido' });
}
