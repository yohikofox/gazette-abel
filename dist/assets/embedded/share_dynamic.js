(() => {
  const shareButton = document.getElementById('share-edition');
  const shareUrl = document.getElementById('share-url');
  const shareQr = document.getElementById('share-qr');
  if (!shareButton || !shareUrl || !shareQr) return;

  // Keep the deployment path (for example /gazette-abel/) but omit the current page hash.
  const siteUrl = () => new URL('./', window.location.href).href;
  shareUrl.value = siteUrl();

  shareButton.addEventListener('click', () => {
    const url = siteUrl();
    shareUrl.value = url;
    try {
      const code = window.qrcode(0, 'M');
      code.addData(url);
      code.make();
      shareQr.innerHTML = code.createSvgTag(5, 4);
      const svg = shareQr.firstElementChild;
      svg.setAttribute('aria-hidden', 'true');
      svg.style.display = 'block';
      svg.style.width = '100%';
      svg.style.height = 'auto';
    } catch {
      shareQr.textContent = 'QR code indisponible. Copiez le lien ci-dessus.';
    }
  });
})();
