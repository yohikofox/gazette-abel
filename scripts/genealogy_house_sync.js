/* Show the uniform earned in the ceremony where a reviewed portrait exists. */
(() => {
  if (typeof sortingAssignments === 'undefined') return;

  const targets = [];
  function collect(selector, imageSelector, press) {
    for (const person of document.querySelectorAll(selector)) {
      const image = person.querySelector(imageSelector);
      if (!image) continue;
      const available = (press ? person.dataset.housePressVariants : person.dataset.houseVariants).split(' ');
      image.dataset.muggleSrc ||= image.getAttribute('src');
      image.addEventListener('error', () => {
        if (image.getAttribute('src') !== image.dataset.muggleSrc) image.setAttribute('src', image.dataset.muggleSrc);
      });
      targets.push({ person: person.dataset.person, image, available, press });
    }
  }
  collect('.genealogy-stage-color .genealogy-card[data-house-variants]', '.sigil img', false);
  collect('.genealogy-stage-press .genealogy-card[data-house-press-variants]', '.sigil img', true);
  collect('.genealogy-fullscreen-tapestry .genealogy-tapestry-person[data-house-variants]', '.tapestry-avatar-color', false);
  collect('.genealogy-fullscreen-tapestry .genealogy-tapestry-person[data-house-press-variants]', '.tapestry-avatar-press', true);

  function refresh() {
    for (const { person, image, available, press } of targets) {
      const house = sortingAssignments[person]?.house;
      const source = house && available.includes(house)
        ? `assets/embedded/gene_house_${press ? 'press_' : ''}${person}_${house}.webp`
        : image.dataset.muggleSrc;
      if (image.getAttribute('src') !== source) image.setAttribute('src', source);
    }
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
