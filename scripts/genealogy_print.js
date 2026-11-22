(() => {
  const button = document.getElementById('genealogy-print');
  const source = document.querySelector('#page5 > .genealogy-fullscreen-tapestry');
  if (!button || !source) return;
  const syncLabel = () => {
    const french = document.documentElement.lang === 'fr';
    button.querySelector('span').textContent = french ? 'Imprimer' : 'Print';
    button.setAttribute('aria-label', french ? 'Imprimer la tapisserie complète' : 'Print the complete tapestry');
  };
  new MutationObserver(syncLabel).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  syncLabel();

  button.addEventListener('click', () => {
    const french = document.documentElement.lang === 'fr';
    const popup = window.open('', '_blank');
    if (!popup) {
      alert(french ? 'Autorisez la fenêtre d’impression dans votre navigateur.' : 'Allow the print window in your browser.');
      return;
    }
    const doc = popup.document;
    doc.open();
    doc.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body></body></html>');
    doc.close();
    doc.documentElement.lang = french ? 'fr' : 'en';
    if (document.documentElement.dataset.hideValerie === 'true') doc.documentElement.dataset.hideValerie = 'true';
    doc.title = french ? 'La tapisserie d’Abel · Impression' : 'Abel’s tapestry · Print';
    const base = doc.createElement('base');
    base.href = document.baseURI;
    doc.head.prepend(base);
    const link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('assets/embedded/genealogy_print_css.css', document.baseURI).href;
    const cssReady = new Promise(resolve => { link.onload = resolve; link.onerror = resolve; });
    doc.head.append(link);
    const extra = doc.createElement('style');
    extra.textContent = '@page {size:A4 landscape;margin:0} html[data-hide-valerie="true"] [data-person="valerie"]{display:none!important}';
    doc.head.append(extra);
    doc.body.className = 'genealogy-print-fullscreen';
    doc.body.dataset.photoMode = document.body.dataset.photoMode || 'couleur';

    const header = doc.createElement('header');
    header.className = 'genealogy-print-header';
    const title = doc.createElement('span');
    title.textContent = french ? 'La tapisserie d’Abel · 2 feuilles A4 paysage' : 'Abel’s tapestry · 2 landscape A4 sheets';
    const printAgain = doc.createElement('button');
    printAgain.type = 'button';
    printAgain.textContent = french ? 'Imprimer' : 'Print';
    printAgain.addEventListener('click', () => popup.print());
    header.append(title, printAgain);
    doc.body.append(header);

    const pages = doc.createElement('main');
    pages.className = 'genealogy-print-pages';
    for (let i = 0; i < 2; i++) {
      const sheet = doc.createElement('section');
      sheet.className = 'genealogy-print-sheet';
      const frame = doc.createElement('div');
      frame.className = 'genealogy-print-frame';
      const tapestry = doc.importNode(source, true);
      tapestry.classList.add('genealogy-print-tapestry');
      tapestry.removeAttribute('role');
      tapestry.removeAttribute('aria-label');
      tapestry.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      tapestry.querySelectorAll('.genealogy-tapestry-person').forEach(person => {
        const x = parseInt(person.style.getPropertyValue('--x'), 10);
        if (i === 0 && x > 1035 || i === 1 && x < 1000) person.remove();
      });
      tapestry.querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
      frame.append(tapestry);
      sheet.append(frame);
      pages.append(sheet);
    }
    doc.body.append(pages);
    popup.opener = null;

    const currentImages = [...pages.querySelectorAll('img')].filter(img =>
      doc.body.dataset.photoMode === 'presse' ? !img.classList.contains('tapestry-avatar-color') : !img.classList.contains('tapestry-avatar-press'));
    Promise.race([
      Promise.allSettled(currentImages.map(img => img.decode?.().catch(() => {}) || Promise.resolve())),
      new Promise(resolve => setTimeout(resolve, 10000))
    ]).then(() => cssReady).then(() => { if (!popup.closed) popup.print(); });
  });
})();
