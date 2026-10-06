import { loadEnv } from 'vite';

export default ({ mode }) => {
  // Acepta los nombres con prefijo VITE_ y también SUPABASE_URL / SUPABASE_ANON_KEY (o PUBLISHABLE_KEY).
  // Nunca se expone ninguna clave secreta.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  return {
    define: {
      __SB_URL__: JSON.stringify(env.VITE_SUPABASE_URL || env.SUPABASE_URL || ''),
      __SB_KEY__: JSON.stringify(env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || '')
    },
    plugins: [{
      name: 'version-file',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.txt', source: 'OUTLET CAQUETA STORE - V10.1 tallas, modelos y pedidos\n' });
      }
    }]
  };
};
