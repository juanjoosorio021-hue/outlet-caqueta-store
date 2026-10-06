import './styles.css';
import {ADMIN_CATS, loadProducts, saveProducts, saveImage, getImage, deleteImage, isAdmin, login, logout, changePassword, compressImage} from './admin.js';
import {acc, initAccount, bindAccount, accountHTML, toggleFav, saveRemoteCart, loadRemoteCart, createOrder} from './account.js';

const WA = '573154795260';
const cats = {
  Damas: ['Todos','Camisas','Camisetas','Jeans','Bermudas','Vestidos','Conjuntos','Lencería','Ropa interior','Accesorios','Zapatos'],
  Hombres: ['Todos','Camisas','Camisetas','Jeans','Bermudas','Zapatos','Accesorios','Ropa interior']
};
let products = loadProducts();

const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CART_KEY='outlet-caqueta-cart';
function loadCart(){try{const c=JSON.parse(localStorage.getItem(CART_KEY)||'[]');return Array.isArray(c)?c.filter(p=>p&&p.name&&Number.isFinite(Number(p.price))):[];}catch{return [];}}
function saveCart(){try{localStorage.setItem(CART_KEY,JSON.stringify(state.cart));}catch{}}
const state = {page:'home',gender:null,category:'Todos',cart:loadCart(),query:''};
const imgCache=new Map();
async function imgSrc(id){if(!id)return null;if(/^(https?:|data:|\/)/.test(id))return id;if(!imgCache.has(id)){const b=await getImage(id).catch(()=>null);imgCache.set(id,b?URL.createObjectURL(b):null);}return imgCache.get(id);}
function hydrateImages(){document.querySelectorAll('[data-img]').forEach(async el=>{const src=await imgSrc(el.dataset.img);if(src&&el.isConnected&&!el.querySelector('img')){const im=new Image();im.src=src;im.alt='';im.loading='lazy';el.prepend(im);el.classList.add('has-img');}});}
let restoringHistory = false;
const money = n => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n);

function logo(){
  return `<span class="logo-mark"><img src="/images/logo.png" alt="OUTLET CAQUETÁ STORE"></span><span class="logo-wordmark"><b>OUTLET CAQUETÁ</b><small>STORE</small></span>`;
}


function header(){
  return `<header class="topbar">
    <button class="brand" data-a="home" aria-label="Ir al inicio">${logo()}</button>
    <div class="search"><span>⌕</span><input id="site-search" aria-label="Buscar productos" placeholder="¿Qué estás buscando?" value="${esc(state.query)}" /><kbd>Buscar</kbd></div>
    <nav><button data-a="gender" data-g="Damas">Damas</button><button data-a="gender" data-g="Hombres">Hombres</button><button data-a="account" aria-label="Mi cuenta">👤 <span class="acc-label">Mi cuenta</span></button><button class="cart" data-a="cart" aria-label="Abrir carrito">🛒 <i>${state.cart.length}</i></button></nav>
  </header>`;
}

function footer(){
  return `<footer><div class="footer-brand">${logo()}</div><div class="footer-location"><strong>Ubicación</strong><span>Florencia · Caquetá · Colombia</span></div><div class="footer-contact"><strong>Comunícate con nosotros</strong><a href="https://wa.me/${WA}" target="_blank" rel="noopener">+57 315 479 5260</a></div><div class="social"><span>SÍGUENOS</span><a href="https://www.instagram.com/juanjose_51/" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.facebook.com/Juanjoosorio.021/" target="_blank" rel="noopener noreferrer">Facebook</a></div><div class="copyright">© 2026 OUTLET CAQUETÁ STORE</div></footer>`;
}

const tickerItems = [
  '¡Que no se lo cuenten, compre bonito!',
  '¡Bueno, bonito y caqueteño!',
  '¡El que busca, encuentra... y a buen precio!',
  '¡Póngase la del pueblo!',
  '¡Para estrenar con toda la actitud!',
  '¡No deje para mañana lo que se puede poner hoy!'
];

function ticker(){
  const row = [...tickerItems,...tickerItems].map((x,i)=>`<span>${x}<b>✦</b></span>`).join('');
  return `<div class="ticker" aria-label="Frases de la tienda"><div class="ticker-track">${row}</div></div>`;
}

function promo(){
  return `<section class="promo section-shell">
    <div class="promo-badge"><small>CAMPAÑA ESPECIAL</small><strong>DÍAS DE<br>GRAN APERTURA</strong></div>
    <div class="promo-copy"><p class="eyebrow">PRIMER MES DE APERTURA</p><h2>Hasta <strong>30% DE DESCUENTO</strong></h2><p>En toda la tienda por nuestro primer mes de apertura.</p><button class="primary" data-a="gender" data-g="Damas">¡Comprar ahora!</button></div>
    <div class="promo-products"><span class="promo-shirt">✦</span><span class="promo-jean">✦</span><span class="promo-tag">30%</span></div>
  </section>`;
}

function home(){
  return `<main class="home">
    <section class="hero">
      
      <div class="hero-in">
        <p class="eyebrow">FLORENCIA · CAQUETÁ · COLOMBIA</p>
        <h1>OUTLET CAQUETÁ <span>STORE</span></h1>
        <p class="lead">Moda bonita, buena y accesible, nacida en Caquetá y pensada para llegar a toda Colombia.</p>
        <div class="hero-actions"><button class="primary" data-a="gender" data-g="Damas">Explorar Damas</button><button class="secondary" data-a="gender" data-g="Hombres">Explorar Hombres</button></div>
      </div>
      <div class="hero-floating hero-left">MODA<br><b>PARA TI</b></div>
      <div class="hero-floating hero-right">CAQUETÁ<br><b>CON ESTILO</b></div><div class="hero-floating hero-extra hero-extra-1">BUENO<br><b>BONITO</b></div><div class="hero-floating hero-extra hero-extra-2">HECHO PARA<br><b>ESTRENAR</b></div><div class="hero-floating hero-extra hero-extra-3">VISTE TU<br><b>ACTITUD</b></div>
    </section>

    <section class="offer-strip section-shell"><div class="offer-intro"><p class="eyebrow">LO QUE ENCONTRARÁS</p><h2>Nacional, importado<br>y piezas especiales.</h2></div><div class="offer-pills"><span>Moda nacional</span><span>Moda importada</span><span>Cuero 100 %</span><span>Accesorios</span><span>Mujer</span><span>Hombre</span></div></section>
    ${ticker()}
    ${promo()}

    <section class="intro section-shell"><div><p class="eyebrow">QUIÉNES SOMOS</p><h2>Una marca caqueteña que quiere vestir a Colombia.</h2></div><p>OUTLET CAQUETÁ STORE nace en Florencia con una idea sencilla: que en nuestra región puedas encontrar ropa bonita, buena y a precios accesibles, con atención cercana. Seleccionamos moda nacional e importada para mujer y hombre, además de prendas especiales como artículos elaborados en cuero 100 %.</p></section>

    <section class="explore section-shell"><div><p class="eyebrow">ENCUENTRA TU ESTILO</p><h2>Explora la tienda.</h2></div><div class="explore-grid"><button class="explore-card women" data-a="gender" data-g="Damas"><strong>Damas</strong><small>Ver colección →</small></button><button class="explore-card men" data-a="gender" data-g="Hombres"><strong>Hombres</strong><small>Ver colección →</small></button></div></section>
  </main>${footer()}`;
}

function card(p){
  return `<article class="card"><div class="photo" data-img="${esc(p.images?.[0]||'')}"><div class="photo-placeholder">${p.gender==='Damas'?'MODA':'ESTILO'}</div><small>${esc(p.category)}</small><button class="fav ${acc.favs.has(p.id)?'on':''}" data-a="fav" data-id="${esc(p.id)}" aria-label="Favorito">${acc.favs.has(p.id)?'♥':'♡'}</button></div><div class="info"><h3>${esc(p.name)}</h3><strong>${money(p.price)}</strong><button data-a="add" data-id="${p.id}">Agregar al carrito</button></div></article>`;
}

function catalog(){
  const q=state.query.trim().toLowerCase();
  const isSearch=!state.gender && !!q;
  const availableCats=isSearch ? ['Todos', ...[...new Set(products.map(p=>p.category))]] : cats[state.gender];
  const arr = products.filter(p=>{
    const matchesGender = state.gender ? p.gender===state.gender : true;
    const matchesCategory = state.category==='Todos'||p.category===state.category;
    const haystack = `${p.name} ${p.category} ${p.gender}`.toLowerCase();
    return matchesGender && matchesCategory && (!q || haystack.includes(q));
  });
  const title=state.gender || 'Resultados';
  const subtitle=state.query ? `Resultados para “${esc(state.query)}”` : 'Elige una categoría y descubre la colección.';
  const cls=state.gender ? `catalog-${state.gender.toLowerCase()}` : 'catalog-search';
  return `<main class="catalog ${cls}"><div class="catalog-bg"></div><div class="catalog-content"><div class="head"><div><p class="eyebrow">${isSearch?'BÚSQUEDA':'COLECCIÓN'}</p><h2>${title}</h2><p>${subtitle}</p></div><button class="back" data-a="home">← Inicio</button></div><div class="cats">${availableCats.map(c=>`<button class="${c===state.category?'active':''}" data-a="cat" data-c="${c}">${c}</button>`).join('')}</div><div class="meta"><b>${arr.length} productos</b><span>${isSearch?'Incluye Damas y Hombres':'Vista compacta · preparada para cientos de referencias'}</span></div><section class="grid">${arr.length?arr.map(card).join(''):`<div class="empty">Esta sección todavía no tiene productos cargados.</div>`}</section></div></main>${footer()}`;
}

function accountPage(){return `<main class="catalog catalog-search account-page"><div class="catalog-bg"></div><div class="catalog-content" id="account-root"></div></main>${footer()}`}

function cart(){
  const total=state.cart.reduce((a,p)=>a+p.price,0);
  return `<main class="catalog cart-page"><div class="head"><div><p class="eyebrow">TU SELECCIÓN</p><h2>Carrito</h2></div><button class="back" data-a="home">← Seguir comprando</button></div>${state.cart.length?`<div class="cart-list">${state.cart.map((p,i)=>`<div class="cart-item"><span class="cart-item-name">${i+1}. ${esc(p.name)}</span><div class="cart-item-actions"><strong>${money(p.price)}</strong><button class="remove-item" data-a="remove" data-index="${i}" aria-label="Quitar ${esc(p.name)} del carrito">Quitar</button></div></div>`).join('')}</div><div class="total"><span>Total</span><strong>${money(total)}</strong></div><button class="wa" data-a="wa">Continuar por WhatsApp</button>`:`<div class="empty">Tu carrito está vacío.</div>`}</main>${footer()}`;
}


function adminLogin(){return `<main class="admin-page"><div class="admin-login"><div class="admin-brand">${logo()}</div><p class="eyebrow">ÁREA PRIVADA</p><h1>Administrador</h1><p>Gestiona tu mercancía sin tocar el código de la tienda.</p><form id="admin-login-form"><label>Contraseña<input id="admin-password" type="password" autocomplete="current-password" required placeholder="Contraseña"></label><button class="primary" type="submit">Entrar</button><small>En esta V7 la cuenta se guarda en este navegador. La conexión a una base de datos en la nube será el siguiente paso.</small></form></div></main>`}

async function admin(){
  if(!isAdmin()) return adminLogin();
  const count=products.length;
  return `<main class="admin-page"><div class="admin-shell"><header class="admin-head"><div><p class="eyebrow">OUTLET CAQUETÁ STORE</p><h1>Administrador</h1><p>Catálogos, lotes y mercancía.</p></div><div class="admin-actions"><button class="secondary" data-admin="home">Ver tienda</button><button class="secondary" data-admin="logout">Cerrar sesión</button></div></header><section class="admin-stats"><div><b>${count}</b><span>Lotes / productos</span></div><div><b>${products.reduce((a,p)=>a+(p.images?.length||0),0)}</b><span>Fotos registradas</span></div><div><b>${new Set(products.map(p=>p.gender)).size}</b><span>Secciones</span></div></section><section class="admin-grid"><div class="admin-card"><div class="admin-card-head"><div><p class="eyebrow">NUEVO LOTE</p><h2>Agregar mercancía</h2></div></div><form id="product-form" class="product-form"><div class="form-grid"><label>Sección<select name="gender" required>${Object.keys(ADMIN_CATS).map(g=>`<option>${g}</option>`).join('')}</select></label><label>Categoría<select name="category" required>${ADMIN_CATS.Damas.map(c=>`<option>${c}</option>`).join('')}</select></label><label class="full">Nombre del lote / producto<input name="name" required placeholder="Ej. Jean rígido clásico"></label><label>Precio COP<input name="price" type="number" min="0" step="100" required placeholder="55000"></label><label>Tallas<input name="sizes" placeholder="28, 30, 32, 34"></label><label class="full">Colores<input name="colors" placeholder="Azul, Negro, Blanco"></label><label class="full">Descripción<textarea name="description" rows="3" placeholder="Detalles del producto..."></textarea></label><label class="full upload-box">Fotos del lote<input id="product-images" name="images" type="file" accept="image/*" multiple required><span>Selecciona 1, 20 o 100 fotos a la vez.</span></label></div><button class="primary" type="submit">Guardar lote</button><div id="admin-message" class="admin-message"></div></form></div><div class="admin-card"><div class="admin-card-head"><div><p class="eyebrow">CATÁLOGO</p><h2>Mercancía cargada</h2></div></div><div id="admin-products">${products.map(p=>adminProduct(p)).join('')||'<div class="empty">Todavía no has cargado mercancía.</div>'}</div></div></section><section class="admin-card backup-card"><div><p class="eyebrow">RESPALDO</p><h2>Copias de seguridad</h2><p>Exporta los datos del catálogo antes de hacer cambios importantes. Las fotos siguen guardadas en este navegador.</p></div><div class="backup-actions"><button class="secondary" data-admin="export">Exportar catálogo</button><label class="secondary import-label">Importar catálogo<input id="import-json" type="file" accept="application/json"></label><button class="secondary" data-admin="password">Cambiar contraseña</button></div></section></div></main>`;
}
function adminProduct(p){return `<article class="admin-product" data-pid="${p.id}"><div class="admin-product-main"><div><span class="admin-chip">${esc(p.gender)} · ${esc(p.category)}</span><h3>${esc(p.name)}</h3><strong>${money(p.price)}</strong><p>${esc(p.sizes?.join(', ')||'Sin tallas')} · ${esc(p.colors?.join(', ')||'Sin colores')}</p></div><div class="admin-product-actions"><button class="secondary" data-admin="edit" data-id="${p.id}">Editar</button><button class="danger" data-admin="delete" data-id="${p.id}">Eliminar</button></div></div><small>${p.images?.length||0} fotos</small></article>`}

async function refreshProducts(){products=loadProducts();renderAdminOnly();}
let adminMsg='';
function renderAdminOnly(){const root=document.querySelector('#app'); if(root){admin().then(html=>{root.innerHTML=html;document.body.dataset.page='admin';bindAdmin();const m=document.querySelector('#admin-message');if(m&&adminMsg){m.textContent=adminMsg;adminMsg='';}});}}
function bindAdmin(){
 const form=document.querySelector('#product-form');
 if(form){const g=form.querySelector('[name=gender]'),c=form.querySelector('[name=category]');g.addEventListener('change',()=>{c.innerHTML=ADMIN_CATS[g.value].map(x=>`<option>${x}</option>`).join('');});}
 if(form) form.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(form);const files=[...document.querySelector('#product-images').files];const p={id:`p-${Date.now()}`,name:f.get('name').trim(),category:f.get('category'),gender:f.get('gender'),price:Number(f.get('price')),sizes:String(f.get('sizes')||'').split(',').map(x=>x.trim()).filter(Boolean),colors:String(f.get('colors')||'').split(',').map(x=>x.trim()).filter(Boolean),description:String(f.get('description')||'').trim(),images:[]};for(const file of files){const id=`img-${Date.now()}-${crypto.randomUUID()}`;await saveImage(id,await compressImage(file));p.images.push(id);}products.push(p);saveProducts(products);form.reset();adminMsg=`Lote guardado correctamente: ${p.name}`;renderAdminOnly();});
 document.querySelectorAll('[data-admin="delete"]').forEach(b=>b.addEventListener('click',async()=>{const p=products.find(x=>x.id===b.dataset.id);if(!p||!confirm(`¿Eliminar ${p.name}?`))return;for(const id of p.images||[])await deleteImage(id);products=products.filter(x=>x.id!==p.id);saveProducts(products);renderAdminOnly();}));
 document.querySelectorAll('[data-admin="edit"]').forEach(b=>b.addEventListener('click',()=>{const p=products.find(x=>x.id===b.dataset.id);if(!p)return;const newPrice=prompt(`Nuevo precio para ${p.name}:`,p.price);if(newPrice!==null&&!Number.isNaN(Number(newPrice))){p.price=Number(newPrice);saveProducts(products);renderAdminOnly();}}));
 document.querySelectorAll('[data-admin="home"]').forEach(b=>b.addEventListener('click',()=>{location.assign('/');}));
 document.querySelectorAll('[data-admin="logout"]').forEach(b=>b.addEventListener('click',()=>{logout();renderAdminOnly();}));
 document.querySelectorAll('[data-admin="export"]').forEach(b=>b.addEventListener('click',()=>{const blob=new Blob([JSON.stringify(products,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='outlet-caqueta-catalogo-backup.json';a.click();URL.revokeObjectURL(a.href);}));
 const imp=document.querySelector('#import-json');if(imp)imp.addEventListener('change',async()=>{const file=imp.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data))throw new Error();products=data.filter(p=>p&&p.id&&p.name&&Number.isFinite(Number(p.price))).map(p=>({...p,price:Number(p.price),images:Array.isArray(p.images)?p.images:[]}));saveProducts(products);renderAdminOnly();}catch{alert('El archivo no tiene un formato válido.');}});
 document.querySelectorAll('[data-admin="password"]').forEach(b=>b.addEventListener('click',async()=>{const old=prompt('Contraseña actual:');const next=prompt('Nueva contraseña:');if(old&&next){alert((await changePassword(old,next))?'Contraseña cambiada.':'La contraseña actual no coincide.');}}));
}

function snapshot(){ return {page:state.page,gender:state.gender,category:state.category,query:state.query}; }
function syncHistory(replace=false){
  if(restoringHistory) return;
  const url = new URL(window.location.href);
  const s=snapshot();
  url.search='';
  if(s.page!=='home') url.searchParams.set('page',s.page);
  if(s.gender) url.searchParams.set('gender',s.gender);
  if(s.category && s.category!=='Todos') url.searchParams.set('category',s.category);
  if(s.query) url.searchParams.set('q',s.query);
  const method=replace?'replaceState':'pushState';
  window.history[method](s,'',url);
}
function restoreHistory(){
  const p=new URLSearchParams(window.location.search);
  state.page=p.get('page')||'home';
  state.gender=p.get('gender')||null;
  state.category=p.get('category')||'Todos';
  state.query=p.get('q')||'';
  if(!['home','catalog','cart','account'].includes(state.page))state.page='home';
  if(state.page==='catalog' && !state.gender){state.page='home';state.category='Todos';}
  if(state.gender && !cats[state.gender]){state.gender=null;state.page='home';state.category='Todos';}
  restoringHistory=true; render(); restoringHistory=false;
}
async function render({scroll=true}={}){
  if(location.pathname.replace(/\/$/,'')==='/admin'){document.querySelector('#app').innerHTML=await admin();document.body.dataset.page='admin';bindAdmin();return;}
  products=loadProducts();
  document.querySelector('#app').innerHTML=header()+(state.page==='catalog'?catalog():state.page==='cart'?cart():state.page==='account'?accountPage():home());
  document.body.dataset.page=state.page;
  if(state.page==='account'){document.querySelector('#account-root').innerHTML=accountHTML({money,products,cart:state.cart});}
  hydrateImages();
  if(scroll) window.scrollTo({top:0,behavior:'smooth'});
}

window.addEventListener('popstate',()=>restoreHistory());



document.addEventListener('submit',async e=>{if(e.target.id==='admin-login-form'){e.preventDefault();const r=await login(document.querySelector('#admin-password').value);if(r.ok){renderAdminOnly();}else alert('Contraseña incorrecta.');}});

document.addEventListener('input',e=>{
  if(e.target.id!=='site-search') return;
  state.query=e.target.value;
  if(state.query.trim()){state.page='catalog';state.gender=null;state.category='Todos';}
  else if(state.page==='catalog' && !state.gender){state.page='home';}
  render({scroll:false});
  syncHistory(true);
  const input=document.querySelector('#site-search');
  if(input){input.focus();input.setSelectionRange(input.value.length,input.value.length);}
});

document.addEventListener('keydown',e=>{
  if(e.key==='Enter' && e.target.id==='site-search'){e.preventDefault();syncHistory(false);}
});

document.addEventListener('click',e=>{
  const x=e.target.closest('[data-a]'); if(!x)return;
  const a=x.dataset.a;
  if(a==='home'){state.page='home';state.gender=null;state.category='Todos';state.query='';}
  if(a==='gender'){state.page='catalog';state.gender=x.dataset.g;state.category='Todos';state.query='';}
  if(a==='cat'){state.page='catalog';state.category=x.dataset.c;}
  if(a==='cart'){state.page='cart';}
  if(a==='account'){state.page='account';}
  if(a==='fav'){if(!acc.user){state.page='account';acc.notice='Inicia sesión o crea tu cuenta para guardar favoritos.';}else toggleFav(x.dataset.id);}
  if(a==='add'){const p=products.find(q=>q.id===x.dataset.id);if(p)state.cart.push(p);}
  if(a==='remove'){const index=Number(x.dataset.index);if(Number.isInteger(index) && index>=0 && index<state.cart.length)state.cart.splice(index,1);state.page='cart';}
  if(a==='wa'){if(!state.cart.length)return;createOrder(state.cart,state.cart.reduce((t,p)=>t+p.price,0));const items=state.cart.map(p=>`• ${p.name} — ${money(p.price)}`).join('\n');const total=state.cart.reduce((t,p)=>t+p.price,0);const msg=`Hola 👋 Soy cliente de OUTLET CAQUETÁ STORE.\n\nQuiero realizar este pedido:\n${items}\n\nTotal: ${money(total)}\n\n¿Me confirmas disponibilidad para continuar?`;window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`,'_blank','noopener');}
  saveCart();syncCart();
  const quiet=a==='add'||a==='wa'||a==='fav'&&state.page!=='account';
  render({scroll:!quiet});
  if(!quiet) syncHistory(false);
});

let cartTimer;
function syncCart(){if(!acc.user)return;clearTimeout(cartTimer);cartTimer=setTimeout(()=>saveRemoteCart(state.cart),600);}
bindAccount({rerender:()=>render({scroll:false}),setCart:items=>{state.cart=items;saveCart();syncCart();render({scroll:false});}});
restoreHistory();
initAccount(async evt=>{
  if(evt==='PASSWORD_RECOVERY'){state.page='account';}
  if(acc.user&&(evt==='INIT'||evt==='SIGNED_IN')&&!state.cart.length){const r=await loadRemoteCart();if(r.length){state.cart=r;saveCart();}}
  if(location.pathname.replace(/\/$/,'')!=='/admin')render({scroll:false});
});
