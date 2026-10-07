// URL de eventos de Wompi: /api/wompi/events — evento transaction.updated
import { admin, sha256, same } from '../_lib.js';

const PAY = { APPROVED: 'Aprobado', DECLINED: 'Rechazado', VOIDED: 'Rechazado', ERROR: 'Rechazado', PENDING: 'Pendiente' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const sb = admin();
  const secrets = (req.body?.environment === 'test' ? [process.env.WOMPI_SANDBOX_EVENTS_SECRET] : req.body?.environment ? [process.env.WOMPI_EVENTS_SECRET] : [process.env.WOMPI_EVENTS_SECRET, process.env.WOMPI_SANDBOX_EVENTS_SECRET]).filter(Boolean);
  if (!sb || !secrets.length) return res.status(500).json({ error: 'No configurado' });

  // Verificación oficial: valores de signature.properties + timestamp + secreto de eventos → SHA-256
  const ev = req.body || {};
  const val = p => p.split('.').reduce((o, k) => o?.[k], ev.data);
  const body = (ev.signature?.properties || []).map(val).join('') + ev.timestamp;
  if (!ev.signature?.checksum || !secrets.some(s => same(sha256(body + s), ev.signature.checksum))) return res.status(401).json({ error: 'Firma inválida' });
  if (ev.event !== 'transaction.updated') return res.status(200).json({ ok: true });

  const t = ev.data?.transaction || {};
  const pay = PAY[t.status];
  const { data: order } = await sb.from('orders').select('*').eq('wompi_reference', t.reference).maybeSingle();
  if (!order || !pay) return res.status(200).json({ ok: true });
  if (Number(order.total) * 100 !== Number(t.amount_in_cents)) return res.status(200).json({ ok: false, reason: 'monto distinto' });
  if (order.payment_status === 'Aprobado') return res.status(200).json({ ok: true }); // ya procesado (idempotente)

  const patch = { payment_status: pay, wompi_transaction_id: t.id, payment_method: t.payment_method_type || 'wompi' };
  if (pay === 'Aprobado') patch.paid_at = new Date().toISOString();
  if (pay === 'Rechazado' && order.order_status === 'Recibido') patch.order_status = 'Cancelado';
  const { data: upd } = await sb.from('orders').update(patch).eq('id', order.id).neq('payment_status', 'Aprobado').select('id');

  // Inventario: solo se descuenta cuando el pago fue realmente aprobado (y una sola vez)
  if (pay === 'Aprobado' && upd?.length) {
    const { data: items } = await sb.from('order_items').select('lot_id,size,qty').eq('order_id', order.id);
    const take = {};
    (items || []).forEach(i => { if (i.lot_id && i.size) { take[i.lot_id] = take[i.lot_id] || {}; take[i.lot_id][i.size] = (take[i.lot_id][i.size] || 0) + i.qty; } });
    for (const [lot, sizes] of Object.entries(take)) {
      const { data: c } = await sb.from('catalog_items').select('stock').eq('id', lot).maybeSingle();
      if (!c) continue;
      const stock = { ...(c.stock || {}) };
      for (const [s, q] of Object.entries(sizes)) if (typeof stock[s] === 'number') stock[s] = Math.max(0, stock[s] - q);
      await sb.from('catalog_items').update({ stock, updated_at: new Date().toISOString() }).eq('id', lot);
    }
  }
  return res.status(200).json({ ok: true });
}
