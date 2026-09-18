import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FORM_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos para concluir o inquérito
const THANKS_COUNTDOWN_S = 10;

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.survey-card');
  const progressBar = document.querySelector('.survey-progress-bar');
  const inputs = form ? form.querySelectorAll('input') : [];
  const submitBtn = document.querySelector('.survey-card button[type="submit"]');
  const disclaimer = document.querySelector('.survey-disclaimer');
  const countdownEl = document.getElementById('thanks-countdown-num');

  const screens = Array.from(document.querySelectorAll('.screen'));
  let formTimeoutId = null;
  let countdownIntervalId = null;

  function showScreen(id) {
    screens.forEach((s) => { s.hidden = s.id !== id; });
  }

  function updateProgress() {
    const groups = new Set();
    inputs.forEach((input) => {
      if (input.checked) groups.add(input.name || input);
    });
    const pct = Math.min(100, 15 + groups.size * 7);
    if (progressBar) progressBar.style.width = pct + '%';
  }

  inputs.forEach((input) => input.addEventListener('change', updateProgress));

  function startSurvey() {
    if (form) form.reset();
    updateProgress();
    showScreen('screen-form');

    clearTimeout(formTimeoutId);
    formTimeoutId = setTimeout(() => {
      showScreen('screen-intro');
    }, FORM_TIMEOUT_MS);
  }

  document.getElementById('start-survey-btn')?.addEventListener('click', startSurvey);
  document.getElementById('nav-start-btn')?.addEventListener('click', startSurvey);

  function fieldValue(name) {
    const checked = form.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.nextElementSibling?.textContent?.trim() ?? null : null;
  }

  function ratingValue(name) {
    const group = Array.from(form.querySelectorAll(`input[name="${name}"]`));
    const index = group.findIndex((input) => input.checked);
    return index === -1 ? null : index + 1;
  }

  function goToThanks() {
    showScreen('screen-thanks');
    let remaining = THANKS_COUNTDOWN_S;
    if (countdownEl) countdownEl.textContent = String(remaining);
    clearInterval(countdownIntervalId);
    countdownIntervalId = setInterval(() => {
      remaining -= 1;
      if (countdownEl) countdownEl.textContent = String(Math.max(remaining, 0));
      if (remaining <= 0) {
        clearInterval(countdownIntervalId);
        window.location.reload();
      }
    }, 1000);
  }

  async function submitSurvey(event) {
    event.preventDefault();
    if (!submitBtn) return;

    const sugestoes = Array.from(form.querySelectorAll('.chip-options input[type="checkbox"]:checked'))
      .map((el) => el.nextElementSibling?.textContent?.trim())
      .filter(Boolean);

    const payload = {
      sexo: fieldValue('sexo'),
      idade: fieldValue('idade'),
      modalidade: fieldValue('modalidade'),
      residencia: fieldValue('residencia'),
      internet: ratingValue('internet'),
      computadores: ratingValue('computadores'),
      livros: ratingValue('livros'),
      manuais: ratingValue('manuais'),
      filmes: ratingValue('filmes'),
      atendimento: ratingValue('atendimento'),
      satisfacao: ratingValue('satisfacao'),
      sugestoes,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'A enviar...';

    const { error } = await supabase.from('survey_responses').insert(payload);

    if (error) {
      console.error('Erro ao enviar respostas:', error);
      submitBtn.textContent = 'Erro — tenta novamente';
      submitBtn.disabled = false;
      if (disclaimer) disclaimer.textContent = 'Não foi possível enviar. Verifica a ligação e tenta novamente.';
      return;
    }

    clearTimeout(formTimeoutId);
    submitBtn.textContent = 'Enviar respostas';
    submitBtn.disabled = false;
    if (disclaimer) disclaimer.textContent = 'As respostas são anónimas e usadas apenas para melhorar o serviço da biblioteca.';
    goToThanks();
  }

  if (form) form.addEventListener('submit', submitSurvey);
});
