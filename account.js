import { supabase, configured } from './lib/supabase.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const T = t => supabase.from(t);
export const acc = { user: null, favs: new Set(), profile: {}, addr: {}, orders: [], mode: 'login', forgot: false, recovery: false, notice: '', err: '' };
let C = { money: n => n, products: [], cart: [] };
let hooks = null;

const clear = () => { acc.favs = new Set(); acc.profile = {}; acc.addr = {}; acc.orders = []; };
async function loadAll() {
  const u = acc.user.id;
  const [p, a, f, o] = await Promise.all([
    T('profiles').select('*').eq('id', u).maybeSingle(),
    T('addresses').select('*').eq('user_id', u).maybeSingle(),
    T('favorites').select('product_id').eq('user_id', u),
    T('orders').select('*,order_items(*)').eq('user_id', u).order('created_at', { ascending: false })
  ]);
  acc.profile = p.data || {}; acc.addr = a.data || {};
  acc.favs = new Set((f.data || []).map(r => r.product_id)); acc.orders = o.data || [];
}

export async function initAccount(onChange) {
  if (!configured) return;
  const { data } = await supabase.auth.getSession();
  acc.user = data.session?.user || null;
  if (acc.user) await loadAll();
  supabase.auth.onAuthStateChange((evt, session) => {
    if (evt === 'INITIAL_SESSION') return;
    setTimeout(async () => {
      acc.user = session?.user || null;
      if (evt === 'PASSWORD_RECOVERY') acc.recovery = true;
      if (acc.user) await loadAll(); else clear();
      onChange(evt);
    }, 0);
  });
  onChange('INIT');
}

export function toggleFav(id) {
  const on = !acc.favs.has(id);
  on ? acc.favs.add(id) : acc.favs.delete(id);
  const q = on ? T('favorites').insert({ user_id: acc.user.id, product_id: id }) : T('favorites').delete().eq('user_id', acc.user.id).eq('product_id', id);
  return q.then(r => { if (r.error) { on ? acc.favs.delete(id) : acc.favs.add(id); hooks?.rerender(); } });
}

const group = cart => { const g = new Map(); cart.forEach(p => { let r = g.get(p.id); if (!r) { r = { product_id: p.id, name: p.name, price: p.price, qty: 0 }; g.set(p.id, r); } r.qty++; }); return [...g.values()]; };
export async function saveRemoteCart(cart) {
  if (!acc.user) return; const u = acc.user.id;
  await T('carts').upsert({ user_id: u, updated_at: new Date().toISOString() });
  await T('cart_items').delete().eq('user_id', u);
  const rows = group(cart).map(r => ({ ...r, user_id: u }));
  if (rows.length) await T('cart_items').insert(rows);
}
export async function loadRemoteCart() {
  const r = await T('cart_items').select('*').eq('user_id', acc.user.id);
  return (r.data || []).flatMap(i => Array.from({ length: i.qty }, () => ({ id: i.product_id, name: i.name, price: Number(i.price), gender: '', category: '', images: [] })));
}
export async function createOrder(cart, total) {
  if (!acc.user || !cart.length) return;
  const { data, error } = await T('orders').insert({ user_id: acc.user.id, total, status: 'Pendiente' }).select().single();
  if (error) return;
  const items = group(cart).map(r => ({ ...r, order_id: data.id }));
  await T('order_items').insert(items);
  acc.orders = [{ ...data, order_items: items }, ...acc.orders];
}

const field = (n, l, v = '', t = 'text', req = false) => `<label>${l}<input name="${n}" type="${t}" value="${esc(v)}" ${req ? 'required' : ''}></label>`;
const msg = () => (acc.err ? `<p class="acc-msg err">${esc(acc.err)}</p>` : '') + (acc.notice ? `<p class="acc-msg">${esc(acc.notice)}</p>` : '');
const benefits = `<section class="acc-card benefits"><h3>Ventajas de tener una cuenta</h3><ul><li>❤️ <b>Favoritos</b><span>Guarda lo que te gusta</span></li><li>🛒 <b>Carrito guardado</b><span>Retómalo desde cualquier dispositivo</span></li><li>📦 <b>Historial de pedidos</b><span>Consulta el estado de tus compras</span></li><li>👤 <b>Datos personales</b><span>Sin escribirlos cada vez</span></li><li>📍 <b>Datos de envío</b><span>Listos para tu próximo pedido</span></li><li>🔄 <b>Recupera tu cuenta</b><span>Desde otro dispositivo</span></li></ul><p class="acc-guest">La cuenta es opcional: también puedes comprar como invitado.</p></section>`;
const notConfigured = `<p class="acc-msg warn">Para activar el registro y almacenamiento de tu cuenta, conecta Supabase en la configuración del proyecto.</p>`;

function outHTML() {
  const login = acc.mode === 'login';
  const form = acc.forgot
    ? `<form id="acc-forgot" class="acc-form"><p>Te enviaremos un enlace para crear una nueva contraseña.</p>${field('email', 'Correo electrónico', '', 'email', true)}<button class="primary" type="submit">Enviar enlace de recuperación</button><button type="button" class="acc-link" data-acc="mode" data-m="login">← Volver a iniciar sesión</button></form>`
    : `<form id="acc-auth" class="acc-form">${field('email', 'Correo electrónico', '', 'email', true)}${field('password', 'Contraseña', '', 'password', true)}<button class="primary" type="submit">${login ? 'Iniciar sesión' : 'Crear cuenta'}</button>${login ? '<button type="button" class="acc-link" data-acc="forgot">¿Olvidaste tu contraseña?</button>' : ''}</form>`;
  return `<div class="head"><div><p class="eyebrow">MI CUENTA 👤</p><h2>Entra o crea tu cuenta</h2><p>Entrar o crear cuenta es opcional. Puedes comprar como invitado.</p></div><button class="back" data-a="home">← Inicio</button></div><div class="acc-grid"><section class="acc-card"><div class="acc-tabs"><button class="${login && !acc.forgot ? 'active' : ''}" data-acc="mode" data-m="login">Iniciar sesión</button><button class="${!login ? 'active' : ''}" data-acc="mode" data-m="signup">Crear cuenta</button></div>${configured ? '' : notConfigured}${msg()}${form}</section>${benefits}</div>`;
}

function inHTML() {
  const p = acc.profile, a = acc.addr, name = [p.first_name, p.last_name].filter(Boolean).join(' ') || acc.user.email;
  const favs = C.products.filter(x => acc.favs.has(x.id));
  const orders = acc.orders.map(o => `<article class="acc-order"><div><b>Pedido #${o.number ?? ''}</b><span>${new Date(o.created_at).toLocaleDateString('es-CO')}</span><em class="st st-${esc(o.status).replace(/\s/g, '')}">${esc(o.status)}</em></div><ul>${(o.order_items || []).map(i => `<li>${i.qty} × ${esc(i.name)} — ${C.money(i.price)}</li>`).join('')}</ul><strong>Total ${C.money(o.total)}</strong></article>`).join('');
  return `<div class="head"><div><p class="eyebrow">MI CUENTA 👤</p><h2>Hola, ${esc(name)}</h2><p>${esc(acc.user.email)}</p></div><div class="acc-head-actions"><button class="back" data-a="home">← Inicio</button><button class="back" data-acc="signout">Cerrar sesión</button></div></div>${msg()}
  ${acc.recovery ? `<section class="acc-card"><h3>Nueva contraseña</h3><form id="acc-newpass" class="acc-form">${field('password', 'Nueva contraseña', '', 'password', true)}<button class="primary" type="submit">Guardar contraseña</button></form></section>` : ''}
  <div class="acc-grid"><section class="acc-card"><h3>👤 Mis datos</h3><form id="acc-profile" class="acc-form acc-2">${field('first_name', 'Nombre', p.first_name)}${field('last_name', 'Apellido', p.last_name)}${field('phone', 'Teléfono', p.phone, 'tel')}<label>Correo electrónico<input value="${esc(acc.user.email)}" readonly></label><button class="primary full" type="submit">Guardar mis datos</button></form></section>
  <section class="acc-card"><h3>📍 Datos de envío</h3><form id="acc-addr" class="acc-form acc-2">${field('recipient', 'Nombre del destinatario', a.recipient)}${field('phone', 'Teléfono', a.phone, 'tel')}${field('department', 'Departamento', a.department)}${field('city', 'Ciudad', a.city)}<div class="full">${field('address', 'Dirección', a.address)}</div>${field('neighborhood', 'Barrio', a.neighborhood)}${field('postal_code', 'Código postal (opcional)', a.postal_code)}<div class="full">${field('reference', 'Referencia', a.reference)}</div><label class="full">Transportadora preferida<select name="carrier">${['', 'Inter Rapidísimo', 'Servientrega', 'Líneas Verdes'].map(c => `<option ${a.carrier === c ? 'selected' : ''} value="${c}">${c || 'Sin preferencia'}</option>`).join('')}</select></label><button class="primary full" type="submit">Guardar datos de envío</button></form></section>
  <section class="acc-card"><h3>❤️ Mis favoritos</h3>${favs.length ? favs.map(f => `<div class="acc-row"><span>${esc(f.name)} · ${C.money(f.price)}</span><button class="remove-item" data-acc="unfav" data-id="${esc(f.id)}">Quitar</button></div>`).join('') : '<p class="acc-empty">Aún no tienes favoritos. Toca ♡ en un producto.</p>'}</section>
  <section class="acc-card"><h3>🛒 Carrito guardado</h3><p class="acc-empty">Tu carrito se guarda en tu cuenta automáticamente. Ahora tienes ${C.cart.length} producto(s).</p><div class="acc-actions"><button class="secondary" data-acc="cartsave">Guardar carrito ahora</button><button class="secondary" data-acc="cartload">Recuperar carrito guardado</button></div></section>
  <section class="acc-card acc-wide"><h3>📦 Mis pedidos</h3>${orders || '<p class="acc-empty">Todavía no tienes pedidos. Los que envíes por WhatsApp con tu cuenta iniciada aparecerán aquí.</p>'}</section></div>`;
}

export function accountHTML(ctx) { C = ctx; return acc.user ? inHTML() : outHTML(); }

const done = (n = '', e = '') => { acc.notice = n; acc.err = e; hooks.rerender(); };
const fd = f => Object.fromEntries(new FormData(f));
export function bindAccount(h) {
  hooks = h;
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-acc]'); if (!b) return;
    const k = b.dataset.acc;
    if (k === 'mode') { acc.mode = b.dataset.m; acc.forgot = false; return done(); }
    if (k === 'forgot') { acc.forgot = true; return done(); }
    if (!configured) return done('', 'Supabase no está conectado todavía.');
    if (k === 'signout') { await supabase.auth.signOut(); return done('Sesión cerrada.'); }
    if (k === 'unfav') { await toggleFav(b.dataset.id); return hooks.rerender(); }
    if (k === 'cartsave') { await saveRemoteCart(C.cart); return done('Carrito guardado en tu cuenta.'); }
    if (k === 'cartload') { const items = await loadRemoteCart(); hooks.setCart(items); return done(items.length ? 'Carrito recuperado.' : 'No tienes un carrito guardado.'); }
  });
  document.addEventListener('submit', async e => {
    const id = e.target.id; if (!id.startsWith('acc-')) return;
    e.preventDefault(); const v = fd(e.target);
    if (!configured) return done('', 'Para activar el registro y almacenamiento de tu cuenta, conecta Supabase en la configuración del proyecto.');
    const u = acc.user?.id; let r;
    if (id === 'acc-auth') {
      if (acc.mode === 'login') { r = await supabase.auth.signInWithPassword({ email: v.email, password: v.password }); return done('', r.error ? 'Correo o contraseña incorrectos.' : ''); }
      if (v.password.length < 6) return done('', 'La contraseña debe tener mínimo 6 caracteres.');
      r = await supabase.auth.signUp({ email: v.email, password: v.password, options: { emailRedirectTo: location.origin + '/?page=account' } });
      return done(r.error ? '' : (r.data.session ? 'Cuenta creada. ¡Bienvenido!' : 'Cuenta creada. Revisa tu correo para confirmarla e inicia sesión.'), r.error?.message || '');
    }
    if (id === 'acc-forgot') { r = await supabase.auth.resetPasswordForEmail(v.email, { redirectTo: location.origin + '/?page=account' }); return done(r.error ? '' : 'Te enviamos un enlace de recuperación a tu correo.', r.error?.message || ''); }
    if (id === 'acc-newpass') { r = await supabase.auth.updateUser({ password: v.password }); if (!r.error) acc.recovery = false; return done(r.error ? '' : 'Contraseña actualizada.', r.error?.message || ''); }
    if (id === 'acc-profile') { r = await T('profiles').upsert({ id: u, email: acc.user.email, ...v, updated_at: new Date().toISOString() }); if (!r.error) acc.profile = { ...acc.profile, ...v }; return done(r.error ? '' : 'Datos guardados.', r.error?.message || ''); }
    if (id === 'acc-addr') { r = await T('addresses').upsert({ user_id: u, ...v, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }); if (!r.error) acc.addr = { ...acc.addr, ...v }; return done(r.error ? '' : 'Datos de envío guardados.', r.error?.message || ''); }
  });
}
