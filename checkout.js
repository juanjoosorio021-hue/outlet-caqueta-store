// Valida el carrito con el catálogo real, crea el pedido y devuelve la configuración FIRMADA del Widget de Wompi.
import { randomBytes } from 'node:crypto';
import { admin, wompiKeys, integritySignature } from '../_lib.js';

const digits = v => String(v || '').replace(/\D/g, '');
const fail = (res, code, error) => res.status(code).json({ error });

export default async function handler(req, res) {
  try { return await run(req, res); }
  catch (e) { console.error('wompi/checkout', e); return fail(res, 500, 'Error interno al iniciar el pago: ' + String(e?.message || e).slice(0, 140)); }
}

async function run(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Método no permitido');
  const sb = admin(), k = wompiKeys();
  if (!sb || !k.pub || !k.integrity) return fail(res, 500, 'El pago en línea aún no está configurado.');

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const { data: ud } = await sb.auth.getUser(token);
  const user = ud?.user;
  if (!user) return fail(res, 401, 'Inicia sesión para pagar en línea.');

  // 1) Carrito: solo se aceptan identificadores, talla y cantidad. El PRECIO sale siempre de la base de datos.
  const raw = (Array.isArray(req.body?.items) ? req.body.items : []).slice(0, 100)
    .map(i => ({ id: String(i.id || ''), lot: String(i.lot || '').slice(0, 80), size: i.size ? String(i.size).slice(0, 20) : null, qty: Math.round(Number(i.qty)) }))
    .filter(i => i.lot && i.qty >= 1 && i.qty <= 99);
  if (!raw.length) return fail(res, 400, 'Tu carrito está vacío.');
  const { data: cat } = await sb.from('catalog_items').select('*').in('id', [...new Set(raw.map(i => i.lot))]);
  const byId = new Map((cat || []).map(c => [c.id, c]));

  const need = {}; const items = [];
  for (const i of raw) {
    const c = byId.get(i.lot);
    if (!c) return fail(res, 409, 'Uno de los productos aún no está disponible para pago en línea.');
    const price = Math.round(Number(c.price));
    if (!(price >= 1000)) return fail(res, 409, `El precio de "${c.name}" no es válido.`);
    const sizes = c.sizes || [];
    if (sizes.length) {
      if (!i.size || !sizes.includes(i.size)) return fail(res, 400, `Elige una talla para "${c.name}".`);
      const st = c.stock?.[i.size];
      need[`${c.id}|${i.size}`] = (need[`${c.id}|${i.size}`] || 0) + i.qty;
      if (st === 0) return fail(res, 409, `"${c.name}" talla ${i.size} está agotada.`);
      if (typeof st === 'number' && need[`${c.id}|${i.size}`] > st) return fail(res, 409, `De "${c.name}" talla ${i.size} solo quedan ${st}.`);
    }
    const model = i.id.includes('#') ? ` · Modelo ${Number(i.id.split('#')[1]) + 1}` : '';
    items.push({ product_id: i.id.slice(0, 80), lot_id: c.id, size: i.size, name: `${c.name}${model}${i.size ? ` · Talla ${i.size}` : ''}`, price, qty: i.qty });
  }
  const total = items.reduce((t, i) => t + i.price * i.qty, 0);

  // 2) Datos del cliente para prellenar Wompi
  const [{ data: addr }, { data: prof }] = await Promise.all([
    sb.from('addresses').select('*').eq('user_id', user.id).maybeSingle(),
    sb.from('profiles').select('*').eq('id', user.id).maybeSingle()
  ]);
  if (!addr?.address || !addr?.city) return fail(res, 400, 'Primero guarda tus datos de envío en Mi cuenta.');

  // 3) Pedido (pago pendiente; NO se descuenta inventario todavía) y referencia única
  const reference = `OCS-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
  const shipping = { ...addr, first_name: prof?.first_name, last_name: prof?.last_name, profile_phone: prof?.phone, email: user.email, country: 'CO' };
  const { data: order, error } = await sb.from('orders').insert({ user_id: user.id, total, order_status: 'Recibido', payment_status: 'Pendiente', payment_method: 'wompi', wompi_reference: reference, shipping }).select().single();
  if (error) return fail(res, 500, 'No se pudo crear el pedido.');
  await sb.from('order_items').insert(items.map(i => ({ ...i, order_id: order.id })));

  // 4) Firma de integridad (solo servidor) y configuración del Widget
  const cents = total * 100;
  const signature = integritySignature(reference, cents, 'COP', k.integrity);
  const site = process.env.SITE_URL || `https://${req.headers.host}`;
  const fullName = [prof?.first_name, prof?.last_name].filter(Boolean).join(' ') || addr.recipient || '';
  const phone = digits(prof?.phone || addr.phone), shipPhone = digits(addr.phone || prof?.phone);
  const customerData = { email: user.email, ...(fullName && { fullName }), ...(/^\d{10}$/.test(phone) && { phoneNumber: phone, phoneNumberPrefix: '+57' }) };
  const shippingAddress = addr.department && /^\d{10}$/.test(shipPhone)
    ? { addressLine1: [addr.address, addr.neighborhood].filter(Boolean).join(', '), city: addr.city, phoneNumber: shipPhone, region: addr.department, country: 'CO' } : undefined;
  const cfg = { currency: 'COP', amountInCents: cents, reference, publicKey: k.pub, signature: { integrity: signature }, redirectUrl: `${site}/pago`, customerData, ...(shippingAddress && { shippingAddress }) };

  // Respaldo: Web Checkout oficial con los mismos datos
  const q = new URLSearchParams({ 'public-key': k.pub, currency: 'COP', 'amount-in-cents': String(cents), reference, 'signature:integrity': signature, 'redirect-url': cfg.redirectUrl, 'customer-data:email': user.email });
  if (fullName) q.set('customer-data:full-name', fullName);
  if (customerData.phoneNumber) { q.set('customer-data:phone-number', phone); q.set('customer-data:phone-number-prefix', '+57'); }
  if (shippingAddress) { q.set('shipping-address:address-line-1', shippingAddress.addressLine1); q.set('shipping-address:country', 'CO'); q.set('shipping-address:phone-number', shipPhone); q.set('shipping-address:city', shippingAddress.city); q.set('shipping-address:region', shippingAddress.region); }
  return res.status(200).json({ cfg, webUrl: `https://checkout.wompi.co/p/?${q}`, order_id: order.id, reference });
}
