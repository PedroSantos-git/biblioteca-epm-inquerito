import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.survey-card');
  const progressBar = document.querySelector('.survey-progress-bar');
  const inputs = form ? form.querySelectorAll('input') : [];

  function updateProgress() {
    const groups = new Set();
    inputs.forEach((input) => {
      if (input.checked) groups.add(input.name || input);
    });
    const pct = Math.min(100, 15 + groups.size * 7);
    if (progressBar) progressBar.style.width = pct + '%';
  }

  inputs.forEach((input) => input.addEventListener('change', updateProgress));
  updateProgress();

  const submitBtn = document.querySelector('.survey-card button[type="submit"]');
  const disclaimer = document.querySelector('.survey-disclaimer');

  function fieldValue(name) {
    const checked = form.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.nextElementSibling?.textContent?.trim() ?? null : null;
  }

  function ratingValue(name) {
    const group = Array.from(form.querySelectorAll(`input[name="${name}"]`));
    const index = group.findIndex((input) => input.checked);
    return index === -1 ? null : index + 1;
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

    submitBtn.textContent = 'Obrigado! ✓ Resposta enviada';
    if (disclaimer) disclaimer.textContent = 'A tua resposta foi registada. Obrigado pela participação!';
    form.reset();
    updateProgress();
    setTimeout(() => {
      submitBtn.textContent = 'Enviar respostas';
      submitBtn.disabled = false;
    }, 2500);
  }

  if (form) form.addEventListener('submit', submitSurvey);
});
