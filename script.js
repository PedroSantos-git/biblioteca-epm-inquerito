// Interações puramente visuais — este protótipo não envia nem guarda dados.

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
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      submitBtn.textContent = 'Obrigado! ✓ (pré-visualização)';
      submitBtn.disabled = true;
      setTimeout(() => {
        submitBtn.textContent = 'Enviar respostas';
        submitBtn.disabled = false;
      }, 2200);
    });
  }
});
