/** Misma API si el Root Directory de Vercel es `hosting`. */
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  const url = process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    res.status(503).json({
      error: 'missing_env',
      message:
        'Define SUPABASE_URL y SUPABASE_ANON_KEY en Vercel → Settings → Environment Variables, luego redeploy.',
    });
    return;
  }

  res.status(200).json({ url, anonKey });
};
