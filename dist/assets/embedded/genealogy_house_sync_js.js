/* Show the uniform earned in the ceremony where a reviewed portrait exists. */
(() => {
  if (typeof sortingAssignments === 'undefined') return;

  const portraitUrl = (person, house) => `assets/embedded/gene_house_${person}_${house}.webp`;
  const targets = [
    ...document.querySelectorAll('.genealogy-stage-color .genealogy-card[data-house-variants]'),
    ...document.querySelectorAll('.genealogy-fullscreen-tapestry .genealogy-tapestry-person[data-house-variants]'),
  ];

  function refresh() {
    for (const target of targets) {
      const image = target.querySelector('.sigil img, .tapestry-avatar-color');
      if (!image) continue;
      image.dataset.muggleSrc ||= image.getAttribute('src');
      const house = sortingAssignments[target.dataset.person]?.house;
      const available = target.dataset.houseVariants.split(' ');
      const source = house && available.includes(house)
        ? portraitUrl(target.dataset.person, house)
        : image.dataset.muggleSrc;
      if (image.getAttribute('src') !== source) image.setAttribute('src', source);
    }
  }

  for (const target of targets) {
    const image = target.querySelector('.sigil img, .tapestry-avatar-color');
    image?.addEventListener('error', () => {
      if (image.getAttribute('src') !== image.dataset.muggleSrc) image.setAttribute('src', image.dataset.muggleSrc);
    });
  }

  const previousSave = saveSorting;
  saveSorting = function (...args) {
    const result = previousSave.apply(this, args);
    refresh();
    return result;
  };
  document.addEventListener('gazette:sorting-updated', refresh);
  window.addEventListener('pageshow', refresh);
  refresh();
})();
