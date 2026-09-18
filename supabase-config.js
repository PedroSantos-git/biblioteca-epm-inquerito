// Configuração pública do Supabase — a "anon key" é segura para expor no
// browser: o acesso aos dados é controlado por Row Level Security (RLS) na
// base de dados, não por este ficheiro.
export const SUPABASE_URL = 'https://emwnhcnvpzeeaielkybw.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_LC8MiKZHyirfgq6Srtinjg_val34LhD';

// Único email com permissões de administrador (gestão de acessos).
// Mantido também no lado do servidor (RLS + trigger), por isso alterar este
// valor não concede/retira poderes reais — serve apenas para adaptar a UI.
export const SUPER_ADMIN_EMAIL = 'pedro.mf.santos@outlook.pt';
