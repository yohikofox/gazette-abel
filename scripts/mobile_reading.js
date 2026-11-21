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

  // On mobile the register becomes a full-screen picker. The existing sorting
  // engine, 3D hat, voice controls and question sequence remain authoritative.
  const sortingLayout = document.querySelector('#page10 .sorting-layout');
  const sortingRegister = sortingLayout?.querySelector('.sorting-register');
  if (sortingLayout && sortingRegister) {
    const personPicker = document.createElement('div');
    personPicker.className = 'sorting-mobile-person';
    personPicker.innerHTML = '<span class="sorting-mobile-eyebrow">Le registre des sorciers</span><button type="button" class="sorting-mobile-person-button" aria-haspopup="dialog" aria-expanded="false"><img alt="" hidden><span><strong>Choisir un prénom</strong><small>Ouvrir le registre familial</small></span><em aria-hidden="true">⌄</em></button>';
    sortingLayout.prepend(personPicker);
    const pickerButton = personPicker.querySelector('button');
    const pickerImage = pickerButton.querySelector('img');
    const pickerName = pickerButton.querySelector('strong');
    const pickerHint = pickerButton.querySelector('small');
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'sorting-mobile-register-close';
    sortingRegister.prepend(closeButton);
    const active = document.getElementById('sorting-active');
    const activeName = document.getElementById('sorting-active-name');
    const activeAvatar = document.getElementById('sorting-active-avatar');
    const language = () => typeof currentEditionLanguage === 'undefined' || currentEditionLanguage === 'fr' ? 'fr' : 'en';
    function syncPicker() {
      const fr = language() === 'fr';
      const selected = !active.hidden && activeName.textContent.trim();
      personPicker.querySelector('.sorting-mobile-eyebrow').textContent = fr ? 'Le registre des sorciers' : 'The family register';
      pickerName.textContent = selected || (fr ? 'Choisir un prénom' : 'Choose a name');
      pickerHint.textContent = selected ? (fr ? 'Changer de prénom' : 'Change person') : (fr ? 'Ouvrir le registre familial' : 'Open the family register');
      pickerImage.hidden = !selected;
      if (selected) pickerImage.src = activeAvatar.src;
      closeButton.textContent = fr ? '× Fermer le registre' : '× Close the register';
      sortingRegister.setAttribute('aria-label', fr ? 'Choisir un membre de la famille' : 'Choose a family member');
    }
    function openPicker() {
      if (document.body.dataset.readerLayout !== 'mobile') return;
      sortingLayout.dataset.mobileRegisterOpen = 'true';
      document.body.classList.add('sorting-mobile-register-open');
      pickerButton.setAttribute('aria-expanded', 'true');
      sortingRegister.setAttribute('role', 'dialog');
      sortingRegister.setAttribute('aria-modal', 'true');
      sortingRegister.querySelector('#sorting-search')?.focus();
    }
    function closePicker() {
      if (!sortingLayout.dataset.mobileRegisterOpen) return;
      delete sortingLayout.dataset.mobileRegisterOpen;
      document.body.classList.remove('sorting-mobile-register-open');
      pickerButton.setAttribute('aria-expanded', 'false');
      sortingRegister.removeAttribute('role');
      sortingRegister.removeAttribute('aria-modal');
      pickerButton.focus();
    }
    pickerButton.addEventListener('click', openPicker);
    closeButton.addEventListener('click', closePicker);
    sortingRegister.addEventListener('click', event => {
      if (event.target.closest('[data-sorting-person]')) {
        closePicker();
        requestAnimationFrame(() => {
          syncPicker();
          document.querySelector('#page10 .sorting-mobile-person')?.scrollIntoView({ block: 'start' });
        });
      }
    });
    document.addEventListener('keydown', event => {
      if (!sortingLayout.dataset.mobileRegisterOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closePicker();
      } else if (event.key === 'Tab') {
        const focusable = [...sortingRegister.querySelectorAll('button:not([disabled]):not([hidden]),input:not([disabled])')].filter(element => element.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    new MutationObserver(syncPicker).observe(active, { attributes: true, attributeFilter: ['hidden'] });
    new MutationObserver(syncPicker).observe(activeName, { childList: true, subtree: true });
    document.querySelectorAll('[data-header-language]').forEach(button => button.addEventListener('click', () => requestAnimationFrame(syncPicker)));
    new MutationObserver(() => {
      if (document.body.dataset.readerLayout !== 'mobile') closePicker();
    }).observe(document.body, { attributes: true, attributeFilter: ['data-reader-layout'] });
    syncPicker();
  }
})();
