(() => {
  const shareButton = document.getElementById('share-edition');
  const shareUrl = document.getElementById('share-url');
  const shareQr = document.getElementById('share-qr');
  if (!shareButton || !shareUrl || !shareQr) return;

  // Keep the deployment path (for example /gazette-abel/) but omit the current page hash.
  const siteUrl = () => new URL('./', window.location.href).href;
  shareUrl.value = siteUrl();

  function styledQrSvg(code) {
    const count = code.getModuleCount();
    const size = count + 8;
    const paper = '#e9cc98';
    const ink = '#21180f';
    const seal = '#542c1f';
    const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="presentation" aria-hidden="true"><rect width="${size}" height="${size}" fill="${paper}"/>`];

    const finderArea = (row, col) =>
      (row < 8 && (col < 8 || col >= count - 8)) ||
      (row >= count - 8 && col < 8);

    parts.push(`<g fill="${ink}">`);
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (code.isDark(row, col) && !finderArea(row, col)) {
          parts.push(`<rect x="${col + 4.07}" y="${row + 4.07}" width=".86" height=".86" rx=".23"/>`);
        }
      }
    }
    parts.push('</g>');

    for (const [x, y] of [[4, 4], [count - 3, 4], [4, count - 3]]) {
      parts.push(`<g><rect x="${x}" y="${y}" width="7" height="7" rx="1.4" fill="${seal}"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx=".85" fill="${paper}"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx=".7" fill="${seal}"/></g>`);
    }

    const middle = 4 + count / 2;
    parts.push(`<g transform="translate(${middle} ${middle})"><circle r="2.65" fill="${paper}" stroke="${seal}" stroke-width=".25"/><path d="M-1.45-.7 L-.95-1.6 L-.3-1.2 Q0-1.32 .3-1.2 L.95-1.6 L1.45-.7 Q1.5.8 0 1.35 Q-1.5.8-1.45-.7Z" fill="${seal}"/><circle cx="-.54" cy="-.3" r=".36" fill="${paper}"/><circle cx=".54" cy="-.3" r=".36" fill="${paper}"/><circle cx="-.54" cy="-.3" r=".13" fill="${ink}"/><circle cx=".54" cy="-.3" r=".13" fill="${ink}"/><path d="M-.24 .25 L.24 .25 L0 .67Z" fill="${paper}"/></g>`);
    parts.push('</svg>');
    return parts.join('');
  }

  shareButton.addEventListener('click', () => {
    const url = siteUrl();
    shareUrl.value = url;
    try {
      const code = window.qrcode(0, 'H');
      code.addData(url);
      code.make();
      shareQr.innerHTML = '<div class="share-qr-masthead"><img src="./assets/embedded/owl.png" alt="" aria-hidden="true"><span>Le courrier de la chouette</span></div><div class="share-qr-code"></div><div class="share-qr-footer">Scannez pour ouvrir la Gazette d’Abel</div>';
      const codeBox = shareQr.querySelector('.share-qr-code');
      codeBox.innerHTML = styledQrSvg(code);
    } catch {
      shareQr.textContent = 'QR code indisponible. Copiez le lien ci-dessus.';
    }
  });
})();
