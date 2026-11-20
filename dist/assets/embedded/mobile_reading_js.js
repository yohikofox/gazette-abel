/* Layout preference is local to this browser; links remain independent of domain. */
(() => {
  const key = 'gazette-reader-layout';
  const values = new Set(['auto', 'mobile', 'journal']);
  let preference = 'auto';
  try { preference = localStorage.getItem(key) || 'auto'; } catch (_) {}
  if (!values.has(preference)) preference = 'auto';
  const phone = () => navigator.userAgentData?.mobile === true || /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry/i.test(navigator.userAgent);
  const buttons = [...document.querySelectorAll('[data-reader-choice]')];
  const text = {
    fr: { auto: 'Automatique', mobile: 'Lecture mobile', journal: 'Page de journal', group: 'Mode de lecture' },
    en: { auto: 'Automatic', mobile: 'Mobile reading', journal: 'Newspaper page', group: 'Reading layout' }
  };
  function apply() {
    const layout = preference === 'auto' ? (phone() ? 'mobile' : 'journal') : preference;
    document.body.dataset.readerLayout = layout;
    // The original page reader is sized from the viewport. Its swipe and page
    // controls also work when mobile reading has been selected on a desktop.
    if (layout === 'mobile') document.body.dataset.mobileReader = 'true';
    if (layout === 'mobile') {
      const toolbar = document.querySelector('.mobile-reader');
      document.documentElement.style.setProperty('--reader-toolbar-height', `${toolbar.getBoundingClientRect().height || 68}px`);
    }
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.readerChoice === preference)));
    const fr = typeof currentEditionLanguage === 'undefined' || currentEditionLanguage === 'fr';
    const labels = text[fr ? 'fr' : 'en'];
    buttons.forEach(button => { button.textContent = labels[button.dataset.readerChoice]; });
    document.querySelector('[data-reader-layout-choice]')?.setAttribute('aria-label', labels.group);
    if (layout === 'mobile' && typeof updateMobileReader === 'function') updateMobileReader();
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    preference = button.dataset.readerChoice;
    try { if (preference === 'auto') localStorage.removeItem(key); else localStorage.setItem(key, preference); } catch (_) {}
    if (typeof readerZoom !== 'undefined') readerZoom = null;
    if (typeof fitPages === 'function') fitPages();
    apply();
    document.querySelector('.paper-viewport.is-current')?.scrollTo(0, 0);
  }));
  document.querySelectorAll('[data-header-language]').forEach(button => button.addEventListener('click', () => requestAnimationFrame(apply)));
  window.addEventListener('resize', apply);
  apply();
})();
