# OUTLET CAQUETÁ STORE — V8

Tienda web (Vite + JavaScript) con panel privado `/admin`.

## Estructura
Todos los archivos están en la raíz (sin carpetas): index.html, main.js, account.js, admin.js, supabase.js, styles.css, imágenes, schema.sql, vercel.json, package.json, vite.config.js.

## Uso
```
npm install
npm run dev      # desarrollo
npm run build    # genera /dist
```
En Vercel: importar el repositorio de GitHub (Framework: Vite). Se despliega solo en cada `git push`.

## Panel admin (`/admin`)
Crea lotes/productos con precio, tallas, colores y varias fotos (se comprimen automáticamente). Exporta/importa el catálogo en JSON.

## Importante
Esta versión es un **prototipo local**: el catálogo y las fotos se guardan en el navegador del administrador (localStorage + IndexedDB), por lo que los clientes NO ven lo que subes. La contraseña se guarda con hash, pero sigue siendo solo local y no es seguridad real.
Siguiente paso para producción: Supabase (base de datos + Storage) y autenticación en servidor.

## Cambios V8
- Estructura correcta para Vite/Vercel (rutas de `/src`, `/images`, `/icons` ahora funcionan).
- Las fotos subidas se muestran en las tarjetas de la tienda.
- Carrito persistente; agregar ya no sube la página al inicio; mensaje de WhatsApp bien codificado.
- Protección contra HTML inyectado (búsqueda, nombres, URLs).
- Móvil: buscador y enlaces Damas/Hombres visibles.
- Admin: categorías según sección, "Ver tienda" corregido, contraseña con hash, importación validada.
- Imágenes optimizadas, favicon con el logo, cabeceras de seguridad en Vercel.

## V9 — Mi cuenta (Supabase)
1. Crea un proyecto en supabase.com y ejecuta `schema.sql` en **SQL Editor**.
2. En Vercel → Settings → Environment Variables agrega **`VITE_SUPABASE_URL`** y **`VITE_SUPABASE_ANON_KEY`** (Supabase → Project Settings → API). Vuelve a desplegar.
3. En Supabase → Authentication → URL Configuration, pon la URL de tu tienda en *Site URL* y `https://TU-DOMINIO/?page=account` en *Redirect URLs* (necesario para recuperar contraseña).
Sin esas variables la pantalla Mi cuenta se ve igual y muestra un aviso. La cuenta de cliente es independiente de `/admin`.
