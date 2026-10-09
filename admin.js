const DB_NAME='outlet-caqueta-admin';
const STORE='images';
const META='outlet-caqueta-products';
const AUTH='outlet-caqueta-admin-auth';

export const ADMIN_CATS={
  Damas:['Camisas','Camisetas','Jeans','Jeans cortos','Vestidos','Conjuntos','Lencería','Pijamas','Ropa interior','Accesorios','Zapatos'],
  Hombres:['Camisas','Camisetas','Jeans','Bermudas','Pijamas','Zapatos','Accesorios','Ropa interior']
};

const demo=[
{id:'demo-1',name:'Jean clásico',category:'Jeans',gender:'Damas',price:69900,sizes:['28','30','32','34'],colors:['Azul'],description:'Referencia de demostración.',images:[]},
{id:'demo-2',name:'Camisa casual',category:'Camisas',gender:'Hombres',price:69900,sizes:['S','M','L','XL'],colors:['Blanco'],description:'Referencia de demostración.',images:[]}
];

function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function saveImage(id,blob){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(blob,id);tx.oncomplete=()=>res(id);tx.onerror=()=>rej(tx.error);});}
export async function getImage(id){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).get(id);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error);});}
export async function deleteImage(id){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}
const fixCat=l=>l.map(p=>p.gender==='Damas'&&p.category==='Bermudas'?{...p,category:'Jeans cortos'}:p);
export function loadProducts(){try{const raw=localStorage.getItem(META);return fixCat(raw?JSON.parse(raw):demo.map(x=>({...x})));}catch{return fixCat(demo.map(x=>({...x})));}}
export function saveProducts(products){localStorage.setItem(META,JSON.stringify(products));}
export function resetProducts(){localStorage.removeItem(META);}
export function isAdmin(){return sessionStorage.getItem(AUTH)==='1';}
const PASS='outlet-caqueta-admin-password';
async function hash(t){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('outlet-caqueta:'+t));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function login(password){const saved=localStorage.getItem(PASS);const h=await hash(password);if(!saved){localStorage.setItem(PASS,h);sessionStorage.setItem(AUTH,'1');return {ok:true,created:true};}if(saved===h||saved===password){if(saved===password)localStorage.setItem(PASS,h);sessionStorage.setItem(AUTH,'1');return {ok:true,created:false};}return {ok:false};}
export function logout(){sessionStorage.removeItem(AUTH);}
export async function changePassword(oldPass,newPass){const r=await login(oldPass);if(!r.ok||r.created)return false;localStorage.setItem(PASS,await hash(newPass));return true;}
export async function compressImage(file,max=1400,q=.82){try{const bmp=await createImageBitmap(file,{imageOrientation:'from-image'});const k=Math.min(1,max/Math.max(bmp.width,bmp.height));const c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(bmp,0,0,c.width,c.height);const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',q));return blob&&blob.size<file.size?blob:file;}catch{return file;}}
