import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || __SB_URL__;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || __SB_KEY__;

// Si faltan las variables, la tienda y la pantalla "Mi cuenta" siguen visibles
// y muestran un aviso; simplemente no se puede registrar ni guardar datos.
export const configured = Boolean(url && key);
export const supabase = configured
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
