// Copia este archivo como owg-supabase-config.js en hosting/ (desarrollo local).
// En Vercel: define SUPABASE_URL y SUPABASE_ANON_KEY en Environment Variables;
// el deploy genera owg-supabase-config.js automáticamente (ver scripts/generate-owg-supabase-config.mjs).
window.OWG_SUPABASE_CONFIG = {
  url: 'https://TU_PROYECTO.supabase.co',
  anonKey: 'TU_SUPABASE_ANON_KEY',
};