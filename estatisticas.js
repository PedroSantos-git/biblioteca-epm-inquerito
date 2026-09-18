import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPER_ADMIN_EMAIL } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

Chart.register(ChartDataLabels);
Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif";

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const SERIES = () => [1, 2, 3, 4, 5, 6, 7, 8].map((n) => cssVar(`--series-${n}`));
const INK = () => cssVar('--ink');
const INK_SOFT = () => cssVar('--ink-soft');
const LINE = () => cssVar('--line');
const PAPER_RAISED = () => cssVar('--paper-raised');
const ACCENT = () => cssVar('--chart-accent');

const CATEGORICAL_QUESTIONS = [
  { field: 'sexo', title: 'Sexo', options: ['Masculino', 'Feminino'] },
  { field: 'idade', title: 'Idade', options: ['≤ 14', '15–18', '19–21', '22–25', '26–35', '> 35'] },
  { field: 'modalidade', title: 'Modalidade que Frequenta', options: ['Profissional', 'CEF', 'Outros'] },
  { field: 'residencia', title: 'Residência', options: ['Montijo', 'Alcochete', 'Moita', 'Palmela', 'Barreiro', 'Setúbal', 'Pinhal Novo', 'Outros'] },
];

const RATING_QUESTIONS = [
  { field: 'internet', title: 'Internet' },
  { field: 'computadores', title: 'Computadores' },
  { field: 'livros', title: 'Livros e Revistas' },
  { field: 'manuais', title: 'Manuais Escolares' },
  { field: 'filmes', title: 'Filmes' },
  { field: 'atendimento', title: 'Atendimento' },
  { field: 'satisfacao', title: 'Satisfação Geral com a Biblioteca' },
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

// Cada mudança de sessão (login, refresh de token, etc.) invoca handleSession de novo;
// este contador garante que só o resultado do pedido mais recente é desenhado no ecrã.
let sessionRenderId = 0;

supabase.auth.onAuthStateChange((_event, session) => {
  handleSession(session);
});

async function handleSession(session) {
  const myRenderId = ++sessionRenderId;

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

  if (myRenderId !== sessionRenderId) return; // uma sessão mais recente já está a ser tratada

  if (!authorized) {
    el('forbidden-email').textContent = email;
    showState('state-forbidden');
    return;
  }

  showState('state-dashboard');
  el('admin-panel').hidden = !isAdmin;
  if (isAdmin) loadAdminList(email, myRenderId);
  loadDashboard(myRenderId);
}

/* ---------- Admin: gestão de acessos ---------- */

async function loadAdminList(currentEmail, renderId) {
  const { data, error } = await supabase.from('authorized_emails').select('*').order('created_at', { ascending: true });
  if (renderId !== sessionRenderId) return;

  const list = el('admin-list');
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
  loadAdminList(currentEmail, sessionRenderId);
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
  loadAdminList(currentEmail, sessionRenderId);
});

/* ---------- Dashboard: estatísticas ---------- */

async function loadDashboard(renderId) {
  const { data: rows, error } = await supabase.from('survey_responses').select('*');
  if (renderId !== sessionRenderId) return; // uma sessão mais recente já assumiu o ecrã

  const grid = el('charts-grid');
  const kpiRow = el('kpi-row');
  grid.innerHTML = '';
  kpiRow.innerHTML = '';

  if (error) {
    grid.innerHTML = `<p>Erro ao carregar respostas: ${error.message}</p>`;
    return;
  }

  el('empty-state').hidden = rows.length !== 0;
  if (rows.length === 0) return;

  renderKpis(rows, kpiRow);

  CATEGORICAL_QUESTIONS.forEach((q) => grid.appendChild(buildPieCard(q, rows)));
  grid.appendChild(buildSugestoesCard(rows));
  RATING_QUESTIONS.forEach((q) => grid.appendChild(buildRatingCard(q, rows)));
}

function average(rows, field) {
  const vals = rows.map((r) => r[field]).filter((v) => v != null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function renderKpis(rows, kpiRow) {
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

function makeCard(title, sub, wide) {
  const card = document.createElement('div');
  card.className = wide ? 'viz-card viz-card--wide' : 'viz-card';
  card.innerHTML = `<h3>${title}</h3><p class="viz-sub">${sub}</p>`;
  return card;
}

/* Pie chart — para perguntas de escolha única (igual ao Google Forms). */
export function buildPieCard(q, rows) {
  const answered = rows.map((r) => r[q.field]).filter(Boolean);
  const counts = {};
  answered.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
  const options = q.options.filter((label) => counts[label]); // só entram no gráfico opções com respostas
  const data = options.map((label) => counts[label] || 0);
  const total = answered.length;
  const colors = SERIES();

  const card = makeCard(q.title, `${total} respostas`);
  const wrap = document.createElement('div');
  wrap.className = 'chart-wrap chart-wrap--pie';
  const canvas = document.createElement('canvas');
  wrap.appendChild(canvas);
  card.appendChild(wrap);

  if (total === 0) {
    card.querySelector('.viz-sub').textContent = 'Ainda sem respostas';
    return card;
  }

  new Chart(canvas, {
    type: 'pie',
    data: {
      labels: options,
      datasets: [{
        data,
        backgroundColor: options.map((_, i) => colors[i % colors.length]),
        borderColor: PAPER_RAISED(),
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: INK(), boxWidth: 10, padding: 10, font: { size: 11 } } },
        datalabels: {
          color: '#fff',
          font: { weight: 700, size: 12 },
          formatter: (value) => `${Math.round((value / total) * 100)}%`,
        },
      },
    },
  });

  return card;
}

/* Bar chart vertical (1-5) — para as perguntas de avaliação (igual ao Google Forms). */
export function buildRatingCard(q, rows) {
  const answered = rows.map((r) => r[q.field]).filter((v) => v != null);
  const counts = [1, 2, 3, 4, 5].map((v) => answered.filter((a) => a === v).length);
  const avg = average(rows, q.field);
  const total = answered.length;

  const card = makeCard(
    `${q.title}${avg != null ? ` — ${avg.toFixed(1)}/5` : ''}`,
    `${total} respostas`,
  );
  const wrap = document.createElement('div');
  wrap.className = 'chart-wrap';
  const canvas = document.createElement('canvas');
  wrap.appendChild(canvas);
  card.appendChild(wrap);

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['1', '2', '3', '4', '5'],
      datasets: [{ data: counts, backgroundColor: ACCENT(), borderRadius: 4, maxBarThickness: 60 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 22 } },
      scales: {
        y: { beginAtZero: true, ticks: { color: INK_SOFT(), precision: 0 }, grid: { color: LINE() } },
        x: { ticks: { color: INK() }, grid: { display: false } },
      },
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: 'end',
          align: 'top',
          clamp: true,
          color: INK(),
          font: { weight: 700, size: 11 },
          formatter: (value) => (total ? `${value} (${Math.round((value / total) * 100)}%)` : `${value}`),
          display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0,
        },
      },
    },
  });

  return card;
}

/* Bar chart horizontal — Sugestões (seleção múltipla, igual ao Google Forms). */
export function buildSugestoesCard(rows) {
  const counts = {};
  let respondents = 0;
  rows.forEach((r) => {
    const arr = r.sugestoes || [];
    if (arr.length) respondents += 1;
    arr.forEach((s) => (counts[s] = (counts[s] || 0) + 1));
  });
  const data = SUGESTAO_OPTIONS.map((label) => counts[label] || 0);
  const maxCount = Math.max(1, ...data);

  const card = makeCard('Sugestões', `seleção múltipla · ${respondents} de ${rows.length} respostas com sugestões`, true);
  const wrap = document.createElement('div');
  wrap.className = 'chart-wrap';
  wrap.style.height = '280px';
  const canvas = document.createElement('canvas');
  wrap.appendChild(canvas);
  card.appendChild(wrap);

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: SUGESTAO_OPTIONS,
      datasets: [{ data, backgroundColor: ACCENT(), borderRadius: 4, maxBarThickness: 34 }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { right: 56 } },
      scales: {
        x: { beginAtZero: true, suggestedMax: maxCount * 1.15, ticks: { color: INK_SOFT(), precision: 0 }, grid: { color: LINE() } },
        y: { ticks: { color: INK(), font: { size: 12 } }, grid: { display: false } },
      },
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: 'end',
          align: 'right',
          clamp: true,
          color: INK(),
          font: { weight: 700, size: 11 },
          formatter: (value) => (rows.length ? `${value} (${Math.round((value / rows.length) * 100)}%)` : `${value}`),
        },
      },
    },
  });

  return card;
}
