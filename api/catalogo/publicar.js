// Publica el catálogo del panel /admin en Supabase para que el servidor valide precios y tallas al cobrar.
import { admin, same } from '../_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const sb = admin(), want = process.env.ADMIN_PUBLISH_TOKEN;
  if (!sb || !want) return res.status(500).json({ error: 'Falta configurar ADMIN_PUBLISH_TOKEN en Vercel.' });
  const got = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!got || !same(got, want)) return res.status(401).json({ error: 'Clave de publicación incorrecta.' });

  const list = Array.isArray(req.body?.items) ? req.body.items : [];
  const rows = list.filter(p => p && p.id && p.name && Number.isFinite(Number(p.price)) && Number(p.price) >= 0).map(p => ({
    id: String(p.id).slice(0, 80), name: String(p.name).slice(0, 160), gender: p.gender ? String(p.gender) : null, category: p.category ? String(p.category) : null,
    price: Math.round(Number(p.price)), sizes: Array.isArray(p.sizes) ? p.sizes.map(String) : [], stock: p.stock && typeof p.stock === 'object' ? p.stock : {}, updated_at: new Date().toISOString()
  }));
  if (rows.length) { const { error } = await sb.from('catalog_items').upsert(rows); if (error) return res.status(500).json({ error: 'No se pudo guardar el catálogo.' }); }
  const { data: old } = await sb.from('catalog_items').select('id');
  const keep = new Set(rows.map(r => r.id)); const stale = (old || []).map(o => o.id).filter(id => !keep.has(id));
  if (stale.length) await sb.from('catalog_items').delete().in('id', stale);
  return res.status(200).json({ ok: true, count: rows.length });
}
