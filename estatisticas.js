import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPER_ADMIN_EMAIL } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)',
                'var(--series-5)', 'var(--series-6)', 'var(--series-7)', 'var(--series-8)'];
const SEQ = ['var(--seq-1)', 'var(--seq-2)', 'var(--seq-3)', 'var(--seq-4)', 'var(--seq-5)'];

const CATEGORICAL_QUESTIONS = [
  { field: 'sexo', title: 'Sexo', options: ['Masculino', 'Feminino'] },
  { field: 'idade', title: 'Idade', options: ['≤ 14', '15–18', '19–21', '22–25', '26–35', '> 35'] },
  { field: 'modalidade', title: 'Modalidade', options: ['Profissional', 'CEF', 'Outros'] },
  { field: 'residencia', title: 'Residência', options: ['Montijo', 'Alcochete', 'Moita', 'Palmela', 'Barreiro', 'Setúbal', 'Pinhal Novo', 'Outros'] },
];

const RATING_QUESTIONS = [
  { field: 'internet', title: 'Internet', low: 'Muito Lenta', high: 'Muito Rápida' },
  { field: 'computadores', title: 'Computadores', low: 'Muito Lentos', high: 'Muito Rápidos' },
  { field: 'livros', title: 'Livros e Revistas', low: 'Muito Insuficiente', high: 'Mais do que Suficiente' },
  { field: 'manuais', title: 'Manuais Escolares', low: 'Muito Insuficientes', high: 'Mais do que Suficiente' },
  { field: 'filmes', title: 'Filmes', low: 'Muito Insuficiente', high: 'Mais do que Suficiente' },
  { field: 'atendimento', title: 'Atendimento', low: 'Muito Mau', high: 'Muito Bom' },
  { field: 'satisfacao', title: 'Satisfação Geral', low: 'Muito Insatisfeito', high: 'Muito Satisfeito', emoji: ['😞', '🙁', '😐', '🙂', '😄'] },
];

const SUGESTAO_OPTIONS = ['📖 Mais livros', '💻 Mais computadores', '🎬 Mais DVDs', '🎲 Mais jogos / materiais lúdicos', '📰 Mais jornais / revistas'];

const el = (id) => document.getElementById(id);
const states = ['state-loading', 'state-login', 'state-forbidden', 'state-dashboard'];
function showState(id) {
  states.forEach((s) => { el(s).hidden = s !== id; });
}

function redirectTo() {
  return `${window.location.origin}${window.location.pathname}`;
}

el('login-google').addEventListener('click', () => {
  supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } });
});
el('login-microsoft').addEventListener('click', () => {
  supabase.auth.signInWithOAuth({ provider: 'azure', options: { redirectTo: redirectTo() } });
});
el('logout-btn').addEventListener('click', () => supabase.auth.signOut());
el('forbidden-logout').addEventListener('click', () => supabase.auth.signOut());

async function init() {
  showState('state-loading');
  const { data: { session } } = await supabase.auth.getSession();
  await handleSession(session);

  supabase.auth.onAuthStateChange((_event, session) => {
    handleSession(session);
  });
}

async function handleSession(session) {
  if (!session) {
    el('user-email').hidden = true;
    el('logout-btn').hidden = true;
    showState('state-login');
    return;
  }

  const email = (session.user.email || '').toLowerCase();
  el('user-email').textContent = email;
  el('user-email').hidden = false;
  el('logout-btn').hidden = false;

  showState('state-loading');

  const isAdmin = email === SUPER_ADMIN_EMAIL;
  let authorized = isAdmin;

  if (!authorized) {
    const { data, error } = await supabase
      .from('authorized_emails')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    authorized = !error && !!data;
  }

  if (!authorized) {
    el('forbidden-email').textContent = email;
    showState('state-forbidden');
    return;
  }

  showState('state-dashboard');
  el('admin-panel').hidden = !isAdmin;
  if (isAdmin) loadAdminList(email);
  loadDashboard();
}

/* ---------- Admin: gestão de acessos ---------- */

async function loadAdminList(currentEmail) {
  const list = el('admin-list');
  list.innerHTML = '<li>A carregar…</li>';
  const { data, error } = await supabase.from('authorized_emails').select('*').order('created_at', { ascending: true });
  if (error) {
    list.innerHTML = `<li>Erro ao carregar lista: ${error.message}</li>`;
    return;
  }
  list.innerHTML = '';
  data.forEach((row) => {
    const li = document.createElement('li');
    const isSuper = row.email === SUPER_ADMIN_EMAIL;
    li.innerHTML = `
      <span>${row.email}${isSuper ? ' <span class="admin-badge">Admin permanente</span>' : ''}</span>
      <button ${isSuper ? 'disabled title="Este acesso nunca pode ser removido"' : ''}>Remover</button>
    `;
    if (!isSuper) {
      li.querySelector('button').addEventListener('click', () => removeAccess(row.email, currentEmail));
    }
    list.appendChild(li);
  });
}

async function removeAccess(email, currentEmail) {
  if (!confirm(`Remover o acesso de ${email}?`)) return;
  const { error } = await supabase.from('authorized_emails').delete().eq('email', email);
  const errBox = el('admin-error');
  if (error) {
    errBox.textContent = error.message;
    errBox.hidden = false;
  } else {
    errBox.hidden = true;
  }
  loadAdminList(currentEmail);
}

el('admin-add-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const { data: { session } } = await supabase.auth.getSession();
  const currentEmail = (session?.user?.email || '').toLowerCase();
  const input = el('admin-new-email');
  const email = input.value.trim().toLowerCase();
  const errBox = el('admin-error');
  errBox.hidden = true;
  if (!email) return;

  const { error } = await supabase.from('authorized_emails').insert({ email, added_by: currentEmail });
  if (error) {
    errBox.textContent = error.message;
    errBox.hidden = false;
    return;
  }
  input.value = '';
  loadAdminList(currentEmail);
});

/* ---------- Dashboard: estatísticas ---------- */

async function loadDashboard() {
  const grid = el('charts-grid');
  const kpiRow = el('kpi-row');
  grid.innerHTML = '';
  kpiRow.innerHTML = '';

  const { data: rows, error } = await supabase.from('survey_responses').select('*');
  if (error) {
    grid.innerHTML = `<p>Erro ao carregar respostas: ${error.message}</p>`;
    return;
  }

  el('empty-state').hidden = rows.length !== 0;
  if (rows.length === 0) return;

  renderKpis(rows);

  CATEGORICAL_QUESTIONS.forEach((q) => grid.appendChild(buildCategoricalCard(q, rows)));
  grid.appendChild(buildSugestoesCard(rows));
  RATING_QUESTIONS.forEach((q) => grid.appendChild(buildRatingCard(q, rows)));
}

function average(rows, field) {
  const vals = rows.map((r) => r[field]).filter((v) => v != null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function renderKpis(rows) {
  const kpiRow = el('kpi-row');
  const total = rows.length;
  const avgSat = average(rows, 'satisfacao');
  const avgAtend = average(rows, 'atendimento');

  const sugestaoCounts = {};
  rows.forEach((r) => (r.sugestoes || []).forEach((s) => { sugestaoCounts[s] = (sugestaoCounts[s] || 0) + 1; }));
  const topSugestao = Object.entries(sugestaoCounts).sort((a, b) => b[1] - a[1])[0];

  const cards = [
    { label: 'Respostas recebidas', value: String(total), sub: 'total acumulado' },
    { label: 'Satisfação média', value: avgSat != null ? `${avgSat.toFixed(1)} / 5` : '—', sub: avgSat != null ? emojiFor(avgSat) : '' },
    { label: 'Atendimento médio', value: avgAtend != null ? `${avgAtend.toFixed(1)} / 5` : '—', sub: '' },
    { label: 'Sugestão mais pedida', value: topSugestao ? topSugestao[0] : '—', sub: topSugestao ? `${topSugestao[1]} de ${total} respostas` : '' },
  ];

  cards.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'kpi-card';
    div.innerHTML = `<div class="kpi-label">${c.label}</div><div class="kpi-value">${c.value}</div><div class="kpi-sub">${c.sub}</div>`;
    kpiRow.appendChild(div);
  });
}

function emojiFor(avg) {
  const emojis = ['😞', '🙁', '😐', '🙂', '😄'];
  return emojis[Math.min(4, Math.max(0, Math.round(avg) - 1))];
}

function buildBarList(rowsData, totalAnswered) {
  const maxCount = Math.max(1, ...rowsData.map((r) => r.count));
  const list = document.createElement('div');
  list.className = 'bar-list';
  rowsData.forEach((r) => {
    const pct = totalAnswered ? Math.round((r.count / totalAnswered) * 100) : 0;
    const widthPct = Math.round((r.count / maxCount) * 100);
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.title = `${r.label}: ${r.count} (${pct}%)`;
    row.innerHTML = `
      <span class="bar-label">${r.label}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${widthPct}%; background:${r.color}"></span></span>
      <span class="bar-value">${r.count} · ${pct}%</span>
    `;
    list.appendChild(row);
  });
  return list;
}

function buildCategoricalCard(q, rows) {
  const answered = rows.map((r) => r[q.field]).filter(Boolean);
  const counts = {};
  answered.forEach((v) => (counts[v] = (counts[v] || 0) + 1));

  const data = q.options.map((label, i) => ({ label, count: counts[label] || 0, color: SERIES[i % SERIES.length] }));

  const card = document.createElement('div');
  card.className = 'viz-card';
  card.innerHTML = `<h3>${q.title}</h3><p class="viz-sub">${answered.length} respostas</p>`;
  card.appendChild(buildBarList(data, answered.length));
  return card;
}

function buildSugestoesCard(rows) {
  const counts = {};
  let respondents = 0;
  rows.forEach((r) => {
    const arr = r.sugestoes || [];
    if (arr.length) respondents += 1;
    arr.forEach((s) => (counts[s] = (counts[s] || 0) + 1));
  });

  const data = SUGESTAO_OPTIONS.map((label, i) => ({ label, count: counts[label] || 0, color: SERIES[i % SERIES.length] }));

  const card = document.createElement('div');
  card.className = 'viz-card';
  card.innerHTML = `<h3>Sugestões</h3><p class="viz-sub">seleção múltipla · ${respondents} respostas com sugestões</p>`;
  card.appendChild(buildBarList(data, rows.length));
  return card;
}

function buildRatingCard(q, rows) {
  const answered = rows.map((r) => r[q.field]).filter((v) => v != null);
  const counts = [1, 2, 3, 4, 5].map((v) => answered.filter((a) => a === v).length);
  const avg = average(rows, q.field);

  const data = [1, 2, 3, 4, 5].map((v, i) => ({
    label: q.emoji ? q.emoji[i] : String(v),
    count: counts[i],
    color: SEQ[i],
  }));

  const card = document.createElement('div');
  card.className = 'viz-card';
  card.innerHTML = `<h3>${q.title}${avg != null ? ` — <span style="color:var(--ink-soft); font-weight:600;">${avg.toFixed(1)} / 5</span>` : ''}</h3>
    <p class="viz-sub">${q.low} → ${q.high} · ${answered.length} respostas</p>`;
  card.appendChild(buildBarList(data, answered.length));
  return card;
}

init();
