// Vercel Cron target: faz uma query real e leve ao Supabase para gerar
// atividade na base de dados e evitar a pausa automática do projeto free
// tier por inatividade (Supabase pausa após alguns dias sem atividade na BD).
//
// Agendado em vercel.json ("crons"). Protegido por CRON_SECRET: só aceita
// pedidos com o header "Authorization: Bearer <CRON_SECRET>" que o Vercel
// Cron injeta automaticamente.
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'] || '';

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[keep-alive] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data, error } = await supabase
      .from('_keepalive')
      .select('pinged_at')
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    console.log('[keep-alive] ok', { pinged_at: data?.pinged_at, at: new Date().toISOString() });
    res.status(200).json({ ok: true, pinged_at: data?.pinged_at ?? null });
  } catch (err) {
    console.error('[keep-alive] failed', err);
    res.status(500).json({ ok: false, error: err?.message ?? String(err) });
  }
}
