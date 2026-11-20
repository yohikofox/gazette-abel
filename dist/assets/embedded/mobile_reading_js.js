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
    // The classic reader still sizes pages; CSS lays them out in one stream.
    if (layout === 'mobile') document.body.dataset.mobileReader = 'true';
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
    if (document.body.dataset.readerLayout === 'mobile') {
      document.querySelector(`#page${readerIndex() + 1}`)?.scrollIntoView({ block: 'start' });
    } else {
      document.querySelector('.paper-viewport.is-current')?.scrollTo(0, 0);
    }
  }));
  document.querySelectorAll('[data-header-language]').forEach(button => button.addEventListener('click', () => requestAnimationFrame(apply)));
  window.addEventListener('resize', apply);
  apply();
  if (document.body.dataset.readerLayout === 'mobile' && /^#page(?:[1-9]|1[0-3])$/.test(location.hash)) {
    requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView({ block: 'start' }));
  }
})();
