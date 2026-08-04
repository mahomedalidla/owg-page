/** Misma API si el Root Directory de Vercel es `hosting`. */
function pickEnv() {
  for (let i = 0; i < arguments.length; i++) {
    const v = process.env[arguments[i]];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

function stripQuotes(s) {
  return String(s).trim().replace(/^["']+|["']+$/g, '');
}

function normalizeSupabaseUrl(raw) {
  if (raw == null) return '';
  let u = stripQuotes(raw);
  if (!u) return '';
  u = u.replace(/\\/g, '/');
  if (!/^https?:\/\//i.test(u)) {
    u = 'https://' + u.replace(/^\/+/, '');
  }
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.origin;
  } catch {
    return '';
  }
}

function buildConfig() {
  const url = normalizeSupabaseUrl(
    pickEnv('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL'),
  );
  const publishable = stripQuotes(
    pickEnv(
      'SUPABASE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    ),
  );
  const legacyAnon = stripQuotes(
    pickEnv(
      'SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'VITE_SUPABASE_ANON_KEY',
    ),
  );
  const anonKey = publishable || legacyAnon;
  const keySource = publishable
    ? 'publishable'
    : legacyAnon
    ? 'anon_legacy'
    : 'missing';
  return { url, anonKey, keySource };
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const { url, anonKey, keySource } = buildConfig();

  if (!anonKey) {
    res.status(503).json({
      error: 'missing_env',
      keySource,
      message:
        'Falta SUPABASE_PUBLISHABLE_KEY (o SUPABASE_ANON_KEY) en Vercel. Luego Redeploy.',
    });
    return;
  }

  if (!url || !/^https?:\/\//i.test(url)) {
    res.status(503).json({
      error: 'invalid_url',
      keySource,
      message:
        'SUPABASE_URL inválida. Debe ser exactamente: https://TU_PROYECTO.supabase.co ' +
        '(con https://, sin comillas ni espacios). Luego Redeploy.',
    });
    return;
  }

  res.status(200).json({ url, anonKey, keySource });
};
