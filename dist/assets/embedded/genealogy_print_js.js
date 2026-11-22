(() => {
  const button = document.getElementById('genealogy-print');
  if (!button) return;
  const syncLabel = () => {
    const french = document.documentElement.lang === 'fr';
    button.querySelector('span').textContent = french ? 'Imprimer' : 'Print';
    button.setAttribute('aria-label', french ? 'Imprimer la tapisserie complète' : 'Print the complete tapestry');
  };
  new MutationObserver(syncLabel).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  syncLabel();
  button.addEventListener('click', () => {
    document.body.classList.add('genealogy-print-fullscreen');
    window.print();
  });
  window.addEventListener('afterprint', () => document.body.classList.remove('genealogy-print-fullscreen'));
})();
